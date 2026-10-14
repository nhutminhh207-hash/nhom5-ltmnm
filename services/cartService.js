import { store } from '../data/store.js';

export class CartService {
  /**
   * Add variant to cart (accumulates quantity)
   */
  add(user, variantId, quantity) {
    if (!user || user.role !== 'user') {
      const err = new Error('Forbidden: Only customers can add to cart');
      err.status = 403;
      throw err;
    }

    const vId = Number(variantId);
    const qty = Number(quantity);

    if (!qty || qty < 1 || isNaN(qty)) {
      const err = new Error('Số lượng không hợp lệ.');
      err.validationErrors = { quantity: 'Số lượng phải lớn hơn hoặc bằng 1.' };
      throw err;
    }

    const variant = store.getVariantById(vId);
    if (!variant || !variant.is_active || !variant.product || !variant.product.is_active) {
      const err = new Error('Sản phẩm hoặc biến thể không tồn tại hoặc đã ẩn.');
      err.validationErrors = { quantity: 'Sản phẩm hoặc biến thể không khả dụng.' };
      throw err;
    }

    // Find existing cart item for this user & variant
    let existingItem = null;
    for (const item of store.cartItems.values()) {
      if (item.user_id === user.id && item.variant_id === vId) {
        existingItem = item;
        break;
      }
    }

    const newTotal = (existingItem ? existingItem.quantity : 0) + qty;
    if (newTotal > variant.stock) {
      const err = new Error('Số lượng vượt quá tồn kho khả dụng.');
      err.validationErrors = { quantity: `Kho chỉ còn ${variant.stock} sản phẩm.` };
      throw err;
    }

    if (existingItem) {
      existingItem.quantity = newTotal;
      return existingItem;
    } else {
      const newItem = {
        id: store.cartItemIdCounter++,
        user_id: user.id,
        variant_id: vId,
        quantity: newTotal
      };
      store.cartItems.set(newItem.id, newItem);
      return newItem;
    }
  }

  /**
   * Update quantity of an existing cart item
   */
  update(user, itemId, quantity) {
    if (!user || user.role !== 'user') {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }

    const item = store.getCartItem(itemId);
    if (!item || item.user_id !== user.id) {
      const err = new Error('Cart item not found');
      err.status = 404;
      throw err;
    }

    const qty = Number(quantity);
    if (!qty || qty < 1 || isNaN(qty)) {
      const err = new Error('Số lượng không hợp lệ.');
      err.validationErrors = { quantity: 'Số lượng phải >= 1.' };
      throw err;
    }

    const variant = store.getVariantById(item.variant_id);
    if (!variant || !variant.is_active || !variant.product || !variant.product.is_active) {
      const err = new Error('Sản phẩm đã ẩn.');
      err.validationErrors = { quantity: 'Sản phẩm đã ẩn.' };
      throw err;
    }

    if (qty > variant.stock) {
      const err = new Error('Vượt kho');
      err.validationErrors = { quantity: `Kho chỉ còn ${variant.stock} sản phẩm.` };
      throw err;
    }

    item.quantity = qty;
    return item;
  }

  /**
   * Remove item from cart
   */
  remove(user, itemId) {
    if (!user || user.role !== 'user') {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }

    const item = store.getCartItem(itemId);
    if (!item || item.user_id !== user.id) {
      const err = new Error('Cart item not found');
      err.status = 404;
      throw err;
    }

    store.cartItems.delete(item.id);
  }
}

export const cartService = new CartService();
