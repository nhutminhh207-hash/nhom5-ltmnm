import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { store } from './data/store.js';
import { cartService } from './services/cartService.js';
import { orderService } from './services/orderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body parsers & method override
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Static file serving from public/
app.use(express.static(path.join(__dirname, 'public')));
app.use('/template', express.static(path.join(__dirname, 'public/template')));

// Handle HTTP method override from _method field in form posts
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method.toUpperCase();
    if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
      req.method = method;
    }
  }
  next();
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'eshopper_session_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true
  }
}));

// Flash messages & Global View Helpers
app.use((req, res, next) => {
  // Retrieve and clear flash messages
  const flash = req.session.flash || { success: null, error: null, errors: [] };
  req.session.flash = { success: null, error: null, errors: [] };
  res.locals.flash = flash;

  // Retrieve current user
  if (req.session.userId) {
    req.user = store.getUserById(req.session.userId);
  } else {
    req.user = null;
  }
  res.locals.user = req.user;
  res.locals.currentPath = req.path;
  res.locals.allCategories = store.getCategories();

  // Cart item count
  if (req.user && req.user.role === 'user') {
    const userCart = store.getUserCartItems(req.user.id);
    res.locals.cartCount = userCart.reduce((acc, it) => acc + it.quantity, 0);
  } else {
    res.locals.cartCount = 0;
  }

  // Helper function to set flash
  req.setFlash = (type, message) => {
    if (!req.session.flash) req.session.flash = { success: null, error: null, errors: [] };
    if (type === 'errors') {
      req.session.flash.errors = Array.isArray(message) ? message : [message];
    } else {
      req.session.flash[type] = message;
    }
  };

  next();
});

// Auth Guard Middlewares
function requireAuth(req, res, next) {
  if (!req.user) {
    req.setFlash('error', 'Vui lòng đăng nhập để tiếp tục.');
    return res.redirect('/login');
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      req.setFlash('error', 'Vui lòng đăng nhập để tiếp tục.');
      return res.redirect('/login');
    }
    if (req.user.role !== role) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head><title>403 Forbidden — EShopper</title><link rel="stylesheet" href="/template/eshopper/css/style.css"></head>
        <body class="p-5 text-center">
          <h1 class="display-4 text-danger font-weight-bold">403</h1>
          <h2 class="mb-4">Truy cập bị từ chối</h2>
          <p class="text-muted">Tài khoản với vai trò <strong>${req.user.role}</strong> không có quyền truy cập trang này.</p>
          <a href="/" class="btn btn-primary mt-3">Về trang chủ</a>
        </body>
        </html>
      `);
    }
    next();
  };
}

function guestOnly(req, res, next) {
  if (req.user) {
    return res.redirect(req.user.role === 'admin' ? '/admin' : '/shop');
  }
  next();
}

// ==========================================
// PUBLIC STORE ROUTES
// ==========================================

// GET / -> Home page
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Trang chủ — EShopper'
  });
});

// GET /shop -> Product catalog with filters & pagination
app.get('/shop', (req, res) => {
  const { category_id, price_range, size, color, q, page } = req.query;

  let min_price, max_price;
  if (price_range === 'under200') {
    max_price = 200000;
  } else if (price_range === '200to500') {
    min_price = 200000;
    max_price = 500000;
  } else if (price_range === 'over500') {
    min_price = 500000;
  }

  const result = store.getProducts({
    category_id,
    page: page || 1,
    limit: 12,
    min_price,
    max_price,
    size,
    color,
    q
  });

  res.render('shop', {
    title: 'Sản phẩm — EShopper',
    products: result.items,
    total: result.total,
    currentPage: result.currentPage,
    lastPage: result.lastPage,
    query: req.query
  });
});

// GET /shop/:product -> Product detail
app.get('/shop/:product', (req, res) => {
  const param = req.params.product;
  let product = null;

  if (/^\d+$/.test(param)) {
    product = store.getProductById(param);
  } else {
    for (const p of store.products.values()) {
      if (p.slug === param) {
        product = store.getProductById(p.id);
        break;
      }
    }
  }

  if (!product || !product.is_active) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head><title>404 Not Found</title><link rel="stylesheet" href="/template/eshopper/css/style.css"></head>
      <body class="p-5 text-center">
        <h1>404 — Sản phẩm không tìm thấy hoặc đã ẩn</h1>
        <a href="/shop" class="btn btn-primary mt-3">Quay lại danh sách sản phẩm</a>
      </body>
      </html>
    `);
  }

  const reviews = store.getProductReviews(product.id);

  res.render('product-detail', {
    title: `${product.name} — EShopper`,
    product,
    reviews
  });
});

// GET /bao-cao -> Project Report (ERD, Use Case, Team assignment)
app.get(['/bao-cao', '/report'], (req, res) => {
  res.render('report', {
    title: 'Báo cáo Đồ án Nhóm — EShopper'
  });
});

// GET /showrooms -> Store Locations Map & Weather widget (External API)
app.get('/showrooms', (req, res) => {
  res.render('showrooms', {
    title: 'Hệ thống Showroom & Bản đồ — EShopper',
    showrooms: store.getShowrooms()
  });
});

// ==========================================
// AJAX RESTful API ENDPOINTS (Bonus Points)
// ==========================================

// GET /api/search -> Live search autocomplete
app.get('/api/search', (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) {
    return res.json({ items: [] });
  }

  const result = store.getProducts({ q, limit: 8 });
  const items = result.items.map(p => {
    const prices = p.variants.map(v => v.price);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image_index: p.image_index,
      category: p.category,
      min_price: prices.length ? Math.min(...prices) : 0
    };
  });

  res.json({ items });
});

// POST /api/cart/add -> AJAX Add to Cart
app.post('/api/cart/add', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      redirect: true,
      error: 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.'
    });
  }

  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      error: 'Admin không được phép mua hàng.'
    });
  }

  const { variant_id, quantity } = req.body;

  try {
    cartService.add(req.user, variant_id, quantity || 1);
    const userCart = store.getUserCartItems(req.user.id);
    const cartCount = userCart.reduce((acc, it) => acc + it.quantity, 0);

    return res.json({
      success: true,
      message: 'Sản phẩm đã được thêm vào giỏ hàng!',
      cartCount
    });
  } catch (err) {
    const msg = err.validationErrors ? Object.values(err.validationErrors).join(' ') : err.message;
    return res.status(400).json({
      success: false,
      error: msg
    });
  }
});

// POST /api/products/:id/reviews -> AJAX Add Review/Comment
app.post('/api/products/:id/reviews', (req, res) => {
  const productId = req.params.id;
  const { userName, rating, comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập nội dung nhận xét.' });
  }

  const review = store.addReview(productId, {
    userName: req.user ? req.user.name : (userName || 'Khách hàng'),
    rating: Number(rating) || 5,
    comment
  });

  res.json({
    success: true,
    review
  });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// GET /login
app.get('/login', guestOnly, (req, res) => {
  res.render('auth/login', {
    title: 'Đăng nhập — EShopper',
    old: {}
  });
});

// POST /login
app.post('/login', guestOnly, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.setFlash('error', 'Email hoặc mật khẩu không đúng.');
    return res.status(422).render('auth/login', {
      title: 'Đăng nhập — EShopper',
      old: { email }
    });
  }

  const user = store.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    req.setFlash('error', 'Email hoặc mật khẩu không đúng.');
    return res.status(422).render('auth/login', {
      title: 'Đăng nhập — EShopper',
      old: { email }
    });
  }

  req.session.userId = user.id;
  req.session.save(() => {
    if (user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/shop');
    }
  });
});

// GET /register
app.get('/register', guestOnly, (req, res) => {
  res.render('auth/register', {
    title: 'Đăng ký — EShopper',
    old: {}
  });
});

// POST /register
app.post('/register', guestOnly, (req, res) => {
  const { name, email, password, password_confirmation } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Họ tên không được để trống.');
  if (!email || !email.includes('@')) errors.push('Email không hợp lệ.');
  if (!password || password.length < 8) errors.push('Mật khẩu phải có tối thiểu 8 ký tự.');
  if (password !== password_confirmation) errors.push('Nhập lại mật khẩu không khớp.');

  if (store.findUserByEmail(email)) {
    errors.push('Email này đã được sử dụng.');
  }

  if (errors.length > 0) {
    req.setFlash('errors', errors);
    return res.status(422).render('auth/register', {
      title: 'Đăng ký — EShopper',
      old: { name, email }
    });
  }

  // Create new user (role is ALWAYS strictly 'user')
  const user = store.createUser({
    name: name.trim(),
    email: email.trim(),
    password,
    role: 'user'
  });

  req.session.userId = user.id;
  req.session.save(() => {
    req.setFlash('success', 'Đăng ký thành công.');
    res.redirect('/shop');
  });
});

// POST /logout
app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/?success=' + encodeURIComponent('Đã đăng xuất.'));
  });
});

// ==========================================
// CUSTOMER SHOPPING ROUTES (Role: user)
// ==========================================

// GET /cart
app.get('/cart', requireRole('user'), (req, res) => {
  const items = store.getUserCartItems(req.user.id);
  const total = items.reduce((acc, it) => acc + ((it.variant ? it.variant.price : 0) * it.quantity), 0);

  res.render('cart', {
    title: 'CN04 — Giỏ mẫu của bạn',
    owner: 'Nhựt',
    items,
    total
  });
});

// POST /cart -> Add item to cart
app.post('/cart', requireRole('user'), (req, res) => {
  const { variant_id, quantity } = req.body;

  try {
    cartService.add(req.user, variant_id, quantity || 1);
    req.setFlash('success', 'Đã thêm sản phẩm vào giỏ hàng thành công.');
    res.redirect('/cart');
  } catch (err) {
    const msg = err.validationErrors ? Object.values(err.validationErrors).join(' ') : err.message;
    req.setFlash('error', msg);
    res.redirect('back');
  }
});

// PATCH /cart/:cartItem -> Update cart quantity
app.patch('/cart/:cartItem', requireRole('user'), (req, res) => {
  const itemId = req.params.cartItem;
  const { quantity } = req.body;

  try {
    cartService.update(req.user, itemId, quantity);
    req.setFlash('success', 'Đã cập nhật số lượng thành công.');
    res.redirect('/cart');
  } catch (err) {
    const msg = err.validationErrors ? Object.values(err.validationErrors).join(' ') : err.message;
    req.setFlash('error', msg);
    res.redirect('/cart');
  }
});

// DELETE /cart/:cartItem -> Remove item from cart
app.delete('/cart/:cartItem', requireRole('user'), (req, res) => {
  const itemId = req.params.cartItem;

  try {
    cartService.remove(req.user, itemId);
    req.setFlash('success', 'Đã xóa sản phẩm khỏi giỏ hàng.');
    res.redirect('/cart');
  } catch (err) {
    req.setFlash('error', err.message);
    res.redirect('/cart');
  }
});

// GET /checkout
app.get('/checkout', requireRole('user'), (req, res) => {
  const items = store.getUserCartItems(req.user.id);
  const total = items.reduce((acc, it) => acc + ((it.variant ? it.variant.price : 0) * it.quantity), 0);

  // Generate checkout token and prices quote for session
  const token = crypto.randomUUID();
  const quotedPrices = {};
  for (const it of items) {
    if (it.variant) {
      quotedPrices[it.variant.id] = it.variant.price;
    }
  }

  req.session.checkoutToken = token;
  req.session.quotedPrices = quotedPrices;

  res.render('checkout', {
    title: 'CN05 — Nền checkout, cần làm form',
    owner: 'Anh Tú',
    items,
    total,
    checkoutToken: token
  });
});

// POST /checkout -> Submit order
app.post('/checkout', requireRole('user'), (req, res) => {
  const { recipient_name, phone, address, checkout_token } = req.body;
  const sessionToken = req.session.checkoutToken;
  const quotedPrices = req.session.quotedPrices || {};

  // Check token match
  if (!checkout_token || checkout_token !== sessionToken) {
    // If it was already completed with this token, return existing order (idempotency)
    const existing = store.getOrderByToken(checkout_token);
    if (existing && existing.user_id === req.user.id) {
      return res.redirect(`/orders/${existing.id}`);
    }
    req.setFlash('error', 'Phiên đặt hàng không hợp lệ hoặc đã hết hạn. Vui lòng xác nhận lại.');
    return res.redirect('/checkout');
  }

  try {
    const order = orderService.checkout(
      req.user,
      { recipient_name, phone, address },
      checkout_token,
      quotedPrices
    );

    // Save last completed order and clear active quote
    req.session.lastOrderToken = checkout_token;
    req.session.lastOrderId = order.id;
    delete req.session.checkoutToken;
    delete req.session.quotedPrices;

    req.setFlash('success', `Đặt hàng thành công! Mã đơn của bạn là #${order.id}.`);
    res.redirect(`/orders/${order.id}`);
  } catch (err) {
    const msg = err.validationErrors ? Object.values(err.validationErrors).join(' ') : err.message;
    req.setFlash('error', msg);
    res.redirect('/checkout');
  }
});

// GET /orders -> User orders list
app.get('/orders', requireRole('user'), (req, res) => {
  const orders = store.getUserOrders(req.user.id);
  res.render('orders', {
    title: 'CN06 — Đơn cá nhân mẫu',
    owner: 'Kiều',
    orders
  });
});

// GET /orders/:order -> User order detail
app.get('/orders/:order', requireRole('user'), (req, res) => {
  const orderId = req.params.order;
  const order = store.getOrderById(orderId);

  if (!order) {
    return res.status(404).send('Đơn hàng không tồn tại.');
  }

  // Abort 403 if not order owner
  if (order.user_id !== req.user.id) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head><title>403 Forbidden</title><link rel="stylesheet" href="/template/eshopper/css/style.css"></head>
      <body class="p-5 text-center">
        <h1>403 — Không có quyền truy cập đơn hàng này</h1>
        <a href="/orders" class="btn btn-primary mt-3">Quay lại danh sách đơn hàng</a>
      </body>
      </html>
    `);
  }

  res.render('order-detail', {
    title: `Đơn #${order.id}`,
    owner: 'Kiều',
    order
  });
});

// PATCH /orders/:order/cancel -> Cancel order
app.patch('/orders/:order/cancel', requireRole('user'), (req, res) => {
  const orderId = req.params.order;

  try {
    orderService.transition(req.user, orderId, 'cancelled');
    req.setFlash('success', 'Đã hủy đơn hàng thành công và hoàn trả số lượng vào kho.');
    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    const msg = err.validationErrors ? Object.values(err.validationErrors).join(' ') : err.message;
    req.setFlash('error', msg);
    res.redirect(`/orders/${orderId}`);
  }
});

// ==========================================
// ADMIN MANAGEMENT ROUTES (Role: admin)
// ==========================================

// GET /admin -> Admin Dashboard
app.get('/admin', requireRole('admin'), (req, res) => {
  const allOrders = store.getAllOrders();
  const allProducts = Array.from(store.products.values());
  const allVariants = Array.from(store.variants.values());
  const allCategories = store.getCategories();

  const totalRevenue = allOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_amount, 0);

  const pendingOrders = allOrders.filter(o => o.status === 'pending').length;

  res.render('admin/dashboard', {
    title: 'Quản trị — Kiều',
    stats: {
      totalProducts: allProducts.length,
      totalVariants: allVariants.length,
      totalCategories: allCategories.length,
      totalOrders: allOrders.length,
      pendingOrders,
      totalRevenue
    },
    orders: allOrders
  });
});

// ================= ADMIN CATEGORIES CRUD (CN01 — Châu) =================

// GET /admin/categories -> List categories
app.get('/admin/categories', requireRole('admin'), (req, res) => {
  const categories = store.getCategories();
  const productsCountMap = {};
  for (const c of categories) {
    productsCountMap[c.id] = Array.from(store.products.values()).filter(p => p.category_id === c.id).length;
  }

  res.render('admin/categories/index', {
    title: 'CN01 — Danh mục',
    owner: 'Châu',
    categories,
    productsCountMap
  });
});

// GET /admin/categories/create -> Form add category
app.get('/admin/categories/create', requireRole('admin'), (req, res) => {
  res.render('admin/categories/create', {
    title: 'Thêm Danh mục mới — CN01'
  });
});

// POST /admin/categories -> Store category
app.post('/admin/categories', requireRole('admin'), (req, res) => {
  const { name, slug, description } = req.body;
  if (!name || !name.trim()) {
    req.setFlash('error', 'Tên danh mục không được để trống.');
    return res.redirect('/admin/categories/create');
  }

  store.createCategory({ name, slug, description });
  req.setFlash('success', `Đã thêm danh mục "${name}" thành công!`);
  res.redirect('/admin/categories');
});

// GET /admin/categories/:category/edit -> Form edit category
app.get('/admin/categories/:category/edit', requireRole('admin'), (req, res) => {
  const cat = store.getCategoryById(req.params.category);
  if (!cat) {
    req.setFlash('error', 'Không tìm thấy danh mục.');
    return res.redirect('/admin/categories');
  }

  res.render('admin/categories/edit', {
    title: `Chỉnh sửa: ${cat.name} — CN01`,
    category: cat
  });
});

// PATCH /admin/categories/:category -> Update category
app.patch('/admin/categories/:category', requireRole('admin'), (req, res) => {
  const { name, slug, description } = req.body;
  if (!name || !name.trim()) {
    req.setFlash('error', 'Tên danh mục không được để trống.');
    return res.redirect(`/admin/categories/${req.params.category}/edit`);
  }

  const updated = store.updateCategory(req.params.category, { name, slug, description });
  if (!updated) {
    req.setFlash('error', 'Không tìm thấy danh mục để cập nhật.');
    return res.redirect('/admin/categories');
  }

  req.setFlash('success', `Đã cập nhật danh mục "${name}" thành công!`);
  res.redirect('/admin/categories');
});

// DELETE /admin/categories/:category -> Delete category
app.delete('/admin/categories/:category', requireRole('admin'), (req, res) => {
  try {
    store.deleteCategory(req.params.category);
    req.setFlash('success', 'Đã xóa danh mục thành công.');
  } catch (err) {
    req.setFlash('error', err.message);
  }
  res.redirect('/admin/categories');
});

// ================= ADMIN PRODUCTS CRUD (CN02 — Danh) =================

// GET /admin/products -> List products
app.get('/admin/products', requireRole('admin'), (req, res) => {
  const products = Array.from(store.products.values()).map(p => ({
    ...p,
    category: store.getCategoryById(p.category_id),
    variants: store.getProductVariants(p.id)
  }));

  res.render('admin/products/index', {
    title: 'CN02 — Sản phẩm',
    owner: 'Danh',
    products
  });
});

// GET /admin/products/create -> Form add product
app.get('/admin/products/create', requireRole('admin'), (req, res) => {
  const categories = store.getCategories();
  res.render('admin/products/create', {
    title: 'Thêm Sản phẩm mới — CN02',
    categories
  });
});

// POST /admin/products -> Store product & variants
app.post('/admin/products', requireRole('admin'), (req, res) => {
  const { name, slug, category_id, description, image_index, is_active, variants } = req.body;

  if (!name || !name.trim()) {
    req.setFlash('error', 'Tên sản phẩm không được để trống.');
    return res.redirect('/admin/products/create');
  }

  // Parse variants array from form submission
  let parsedVariants = [];
  if (variants && typeof variants === 'object') {
    parsedVariants = Object.values(variants);
  }

  const prod = store.createProduct({
    name,
    slug,
    category_id,
    description,
    image_index,
    is_active,
    variants: parsedVariants
  });

  req.setFlash('success', `Đã tạo sản phẩm "${prod.name}" cùng các biến thể thành công!`);
  res.redirect('/admin/products');
});

// GET /admin/products/:product/edit -> Form edit product
app.get('/admin/products/:product/edit', requireRole('admin'), (req, res) => {
  const prod = store.getProductById(req.params.product);
  if (!prod) {
    req.setFlash('error', 'Không tìm thấy sản phẩm.');
    return res.redirect('/admin/products');
  }

  const categories = store.getCategories();
  res.render('admin/products/edit', {
    title: `Sửa: ${prod.name} — CN02`,
    product: prod,
    categories
  });
});

// PATCH /admin/products/:product -> Update product & variants
app.patch('/admin/products/:product', requireRole('admin'), (req, res) => {
  const { name, slug, category_id, description, image_index, is_active, variants } = req.body;

  if (!name || !name.trim()) {
    req.setFlash('error', 'Tên sản phẩm không được để trống.');
    return res.redirect(`/admin/products/${req.params.product}/edit`);
  }

  let parsedVariants = [];
  if (variants && typeof variants === 'object') {
    parsedVariants = Object.values(variants);
  }

  const updated = store.updateProduct(req.params.product, {
    name,
    slug,
    category_id,
    description,
    image_index,
    is_active,
    variants: parsedVariants
  });

  if (!updated) {
    req.setFlash('error', 'Không tìm thấy sản phẩm để cập nhật.');
    return res.redirect('/admin/products');
  }

  req.setFlash('success', `Đã cập nhật sản phẩm "${name}" thành công!`);
  res.redirect('/admin/products');
});

// DELETE /admin/products/:product -> Delete product
app.delete('/admin/products/:product', requireRole('admin'), (req, res) => {
  store.deleteProduct(req.params.product);
  req.setFlash('success', 'Đã xóa sản phẩm và các biến thể liên quan thành công.');
  res.redirect('/admin/products');
});

// ================= ADMIN ORDERS (CN06 — Kiều) =================

// GET /admin/orders -> CN06 Đơn Admin
app.get('/admin/orders', requireRole('admin'), (req, res) => {
  const rows = store.getAllOrders().map(o => ({
    id: o.id,
    user_id: o.user_id,
    status: o.status,
    total_amount: o.total_amount
  }));

  res.render('module', {
    title: 'CN06 — Đơn Admin',
    owner: 'Kiều',
    rows
  });
});

// GET /admin/orders/:order -> Admin single order view
app.get('/admin/orders/:order', requireRole('admin'), (req, res) => {
  const orderId = req.params.order;
  const order = store.getOrderById(orderId);

  if (!order) {
    return res.status(404).send('Đơn hàng không tồn tại.');
  }

  res.render('admin-order-detail', {
    title: `Admin — Đơn #${order.id}`,
    owner: 'Kiều',
    order
  });
});

// PATCH /admin/orders/:order/status -> Admin update order status
app.patch('/admin/orders/:order/status', requireRole('admin'), (req, res) => {
  const orderId = req.params.order;
  const { status } = req.body;

  try {
    orderService.transition(req.user, orderId, status);
    req.setFlash('success', `Đã chuyển trạng thái đơn hàng sang "${status}" thành công.`);
    res.redirect(`/admin/orders/${orderId}`);
  } catch (err) {
    const msg = err.validationErrors ? Object.values(err.validationErrors).join(' ') : err.message;
    req.setFlash('error', msg);
    res.redirect(`/admin/orders/${orderId}`);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head><title>404 — Không tìm thấy</title><link rel="stylesheet" href="/template/eshopper/css/style.css"></head>
    <body class="p-5 text-center">
      <h1>404 — Trang không tồn tại</h1>
      <p class="text-muted">Đường dẫn bạn yêu cầu không tồn tại hoặc đã bị di chuyển.</p>
      <a href="/" class="btn btn-primary mt-3">Về trang chủ</a>
    </body>
    </html>
  `);
});

// Start Server on 0.0.0.0:3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[EShopper] Server running at http://0.0.0.0:${PORT}`);
});
