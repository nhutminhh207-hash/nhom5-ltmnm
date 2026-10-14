import { store } from '../data/store.js';

export const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: []
};

export class OrderService {
  /**
   * Checkout with delivery info, token, and session-quoted prices
   */
  checkout(user, delivery, token, quotedPrices = {}) {
    if (!user || user.role !== 'user') {
      const err = new Error('Forbidden: Only customers can checkout');
      err.status = 403;
      throw err;
    }

    if (!token) {
      const err = new Error('Token is required');
      err.validationErrors = { token: 'Thiếu token giao dịch.' };
      throw err;
    }

    // Check if order already exists with this token (idempotency)
    const existing = store.getOrderByToken(token);
    if (existing) {
      if (existing.user_id !== user.id) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }
      return existing;
    }

    // Get current user cart
    const cart = store.getUserCartItems(user.id);
    if (cart.length === 0) {
      const err = new Error('Giỏ hàng trống.');
      err.validationErrors = { cart: 'Giỏ hàng của bạn đang trống.' };
      throw err;
    }

    // Validate prices, active state, stock
    let total = 0;
    const itemsToOrder = [];

    for (const item of cart) {
      const v = item.variant;
      if (!v || !v.is_active || !v.product || !v.product.is_active || item.quantity < 1 || item.quantity > v.stock) {
        const err = new Error('Có sản phẩm đã ẩn hoặc không đủ kho.');
        err.validationErrors = { cart: 'Có sản phẩm đã ẩn hoặc không đủ kho.' };
        throw err;
      }

      if (!(v.id in quotedPrices) || Number(quotedPrices[v.id]) !== v.price) {
        const err = new Error('Giá hoặc giỏ đã thay đổi. Mở lại checkout và xác nhận giá mới.');
        err.validationErrors = { price: 'Giá hoặc giỏ đã thay đổi. Mở lại checkout và xác nhận giá mới.' };
        throw err;
      }

      const lineTotal = v.price * item.quantity;
      total += lineTotal;

      itemsToOrder.push({
        variant: v,
        quantity: item.quantity,
        lineTotal
      });
    }

    // Create order
    const orderId = store.orderIdCounter++;
    const orderItems = itemsToOrder.map((it, idx) => ({
      id: idx + 1,
      order_id: orderId,
      variant_id: it.variant.id,
      product_name: it.variant.product.name,
      sku: it.variant.sku,
      size: it.variant.size,
      color: it.variant.color,
      unit_price: it.variant.price,
      quantity: it.quantity,
      line_total: it.lineTotal
    }));

    const order = {
      id: orderId,
      user_id: user.id,
      checkout_token: token,
      recipient_name: delivery.recipient_name || user.name,
      phone: delivery.phone || '',
      address: delivery.address || '',
      payment_method: 'cod',
      status: 'pending',
      total_amount: total,
      created_at: new Date(),
      items: orderItems
    };

    // Decrement stock
    for (const it of itemsToOrder) {
      it.variant.stock -= it.quantity;
    }

    // Clear cart items for this user
    for (const item of cart) {
      store.cartItems.delete(item.id);
    }

    store.orders.set(order.id, order);
    return order;
  }

  /**
   * Transition order status (with stock rollback if cancelled)
   */
  transition(actor, orderId, target) {
    const order = store.getOrderById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    if (actor.role !== 'admin') {
      if (actor.role !== 'user' || order.user_id !== actor.id) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }
      if (target !== 'cancelled' || !['pending', 'cancelled'].includes(order.status)) {
        const err = new Error('Forbidden: Users can only cancel pending orders');
        err.status = 403;
        throw err;
      }
    }

    if (order.status === target) {
      return order;
    }

    const allowedNext = TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(target)) {
      const err = new Error('Không được chuyển trạng thái này.');
      err.validationErrors = { status: `Không thể chuyển từ "${order.status}" sang "${target}".` };
      throw err;
    }

    // If cancelling, restore stock
    if (target === 'cancelled') {
      for (const item of order.items) {
        const v = store.getVariantById(item.variant_id);
        if (v) {
          v.stock += item.quantity;
        }
      }
    }

    order.status = target;
    return order;
  }
}

export const orderService = new OrderService();
