import bcrypt from 'bcryptjs';

// Pre-hashed password for DemoShop2026!
const DEMO_PASSWORD_HASH = bcrypt.hashSync('DemoShop2026!', 10);

class DataStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = new Map();
    this.categories = new Map();
    this.products = new Map();
    this.variants = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    this.reviews = new Map();

    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.productIdCounter = 1;
    this.variantIdCounter = 1;
    this.cartItemIdCounter = 1;
    this.orderIdCounter = 1;
    this.reviewIdCounter = 1;

    this.seed();
  }

  seed() {
    // 1. Users
    const admin = {
      id: this.userIdCounter++,
      name: 'Admin demo',
      email: 'admin@example.test',
      password: DEMO_PASSWORD_HASH,
      role: 'admin',
      avatar: '/template/eshopper/img/user.jpg',
      created_at: new Date()
    };
    const userA = {
      id: this.userIdCounter++,
      name: 'User A demo',
      email: 'usera@example.test',
      password: DEMO_PASSWORD_HASH,
      role: 'user',
      avatar: '/template/eshopper/img/user.jpg',
      created_at: new Date()
    };
    const userB = {
      id: this.userIdCounter++,
      name: 'User B demo',
      email: 'userb@example.test',
      password: DEMO_PASSWORD_HASH,
      role: 'user',
      avatar: '/template/eshopper/img/user.jpg',
      created_at: new Date()
    };
    this.users.set(admin.id, admin);
    this.users.set(userA.id, userA);
    this.users.set(userB.id, userB);

    // 2. Categories
    const catData = [
      { name: 'Áo thun', slug: 'ao-thun', description: 'Các mẫu áo thun cotton thoáng mát, phong cách năng động cho giới trẻ.' },
      { name: 'Áo sơ mi', slug: 'ao-so-mi', description: 'Áo sơ mi công sở và dạo phố thanh lịch, chất vải chống nhăn cao cấp.' },
      { name: 'Quần', slug: 'quan', description: 'Bộ sưu tập quần tây, jeans và quần short thiết kế ôm dáng, thoải mái.' }
    ];
    const categoryList = [];
    for (const c of catData) {
      const cat = { id: this.categoryIdCounter++, ...c, created_at: new Date() };
      this.categories.set(cat.id, cat);
      categoryList.push(cat);
    }

    // 3. Products & Variants (15 products, 2 variants each: M/Đen, L/Trắng)
    for (let i = 1; i <= 15; i++) {
      const cat = categoryList[(i - 1) % 3];
      const product = {
        id: this.productIdCounter++,
        category_id: cat.id,
        name: `Sản phẩm demo ${i}`,
        slug: `san-pham-demo-${i}`,
        description: `Dữ liệu mẫu chuẩn của bộ sưu tập thời trang EShopper. Thiết kế tinh tế, chất liệu cao cấp bền đẹp, phù hợp mặc hàng ngày hay đi làm.`,
        image_path: 'products/demo.jpg',
        image_index: ((i - 1) % 8) + 1,
        is_active: true,
        created_at: new Date()
      };
      this.products.set(product.id, product);

      const variantDefs = [
        { size: 'M', color: 'Đen', priceBonus: 0 },
        { size: 'L', color: 'Trắng', priceBonus: 10000 }
      ];

      for (const [j, vDef] of variantDefs.entries()) {
        const stock = i === 1 ? 0 : (i === 2 ? 1 : 20);
        const variant = {
          id: this.variantIdCounter++,
          product_id: product.id,
          sku: `DEMO-${String(i).padStart(2, '0')}-${vDef.size}`,
          size: vDef.size,
          color: vDef.color,
          price: 150000 + i * 1000 + vDef.priceBonus,
          stock: stock,
          is_active: true,
          created_at: new Date()
        };
        this.variants.set(variant.id, variant);
      }

      // Add a couple sample reviews
      if (i <= 5) {
        this.reviews.set(this.reviewIdCounter++, {
          id: this.reviewIdCounter,
          product_id: product.id,
          user_name: 'Khách hàng thân thiết',
          rating: 5,
          comment: 'Chất vải rất mịn màng, đóng gói cẩn thận và giao hàng nhanh chóng!',
          created_at: new Date(Date.now() - i * 3600000 * 24)
        });
      }
    }

    // Seed orders for User A & User B
    const customers = [
      { user: userA, token: '10000000-0000-4000-8000-000000000001', sku: 'DEMO-03-M' },
      { user: userB, token: '10000000-0000-4000-8000-000000000002', sku: 'DEMO-04-M' }
    ];

    for (const { user, token, sku } of customers) {
      const v = this.findVariantBySku(sku);
      if (v && v.stock >= 2) {
        const prod = this.products.get(v.product_id);
        const orderId = this.orderIdCounter++;
        const order = {
          id: orderId,
          user_id: user.id,
          checkout_token: token,
          recipient_name: user.name,
          phone: '0900000000',
          address: 'Địa chỉ demo, không phải thông tin thật',
          payment_method: 'cod',
          status: 'pending',
          total_amount: v.price * 2,
          created_at: new Date(),
          items: [
            {
              id: 1,
              order_id: orderId,
              variant_id: v.id,
              product_name: prod ? prod.name : 'Sản phẩm demo',
              sku: v.sku,
              size: v.size,
              color: v.color,
              unit_price: v.price,
              quantity: 2,
              line_total: v.price * 2
            }
          ]
        };
        this.orders.set(order.id, order);
        v.stock -= 2; // Kho giảm đúng lượng đã đặt
      }

      // Seed cart items: DEMO-05-M and DEMO-05-L
      for (const cartSku of ['DEMO-05-M', 'DEMO-05-L']) {
        const cv = this.findVariantBySku(cartSku);
        if (cv) {
          const cartItem = {
            id: this.cartItemIdCounter++,
            user_id: user.id,
            variant_id: cv.id,
            quantity: 1
          };
          this.cartItems.set(cartItem.id, cartItem);
        }
      }
    }
  }

  // ================= User queries =================
  getUserById(id) {
    return this.users.get(Number(id)) || null;
  }

  findUserByEmail(email) {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  createUser({ name, email, password, role = 'user' }) {
    const user = {
      id: this.userIdCounter++,
      name,
      email,
      password: bcrypt.hashSync(password, 10),
      role: 'user', // strictly enforced
      avatar: '/template/eshopper/img/user.jpg',
      created_at: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  updateUser(id, data) {
    const user = this.users.get(Number(id));
    if (!user) return null;
    if (data.name) user.name = data.name.trim();
    if (data.avatar) user.avatar = data.avatar;
    return user;
  }

  // ================= Category queries & CRUD =================
  getCategories() {
    return Array.from(this.categories.values()).sort((a, b) => a.id - b.id);
  }

  getCategoryById(id) {
    return this.categories.get(Number(id)) || null;
  }

  createCategory({ name, slug, description }) {
    const id = this.categoryIdCounter++;
    const cat = {
      id,
      name: name.trim(),
      slug: slug ? slug.trim() : this.slugify(name),
      description: description ? description.trim() : '',
      created_at: new Date()
    };
    this.categories.set(id, cat);
    return cat;
  }

  updateCategory(id, { name, slug, description }) {
    const cat = this.categories.get(Number(id));
    if (!cat) return null;
    if (name) cat.name = name.trim();
    if (slug) cat.slug = slug.trim();
    if (description !== undefined) cat.description = description.trim();
    return cat;
  }

  deleteCategory(id) {
    const numId = Number(id);
    // Count products belonging to this category
    const count = Array.from(this.products.values()).filter(p => p.category_id === numId).length;
    if (count > 0) {
      const err = new Error(`Không thể xóa danh mục này vì còn ${count} sản phẩm đang trực thuộc.`);
      err.hasProducts = true;
      throw err;
    }
    return this.categories.delete(numId);
  }

  // ================= Product queries & CRUD =================
  getProducts({ category_id, page = 1, limit = 12, min_price, max_price, size, color, q } = {}) {
    let prods = Array.from(this.products.values()).filter(p => p.is_active);

    if (category_id) {
      prods = prods.filter(p => p.category_id === Number(category_id));
    }

    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      prods = prods.filter(p => {
        const cat = this.getCategoryById(p.category_id);
        return p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          (cat && cat.name.toLowerCase().includes(term));
      });
    }

    if (min_price || max_price || size || color) {
      prods = prods.filter(p => {
        const pVariants = this.getProductVariants(p.id).filter(v => v.is_active);
        return pVariants.some(v => {
          let matches = true;
          if (min_price && v.price < Number(min_price)) matches = false;
          if (max_price && v.price > Number(max_price)) matches = false;
          if (size && v.size !== size) matches = false;
          if (color && v.color !== color) matches = false;
          return matches;
        });
      });
    }

    const total = prods.length;
    const lastPage = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.max(1, Number(page)), lastPage);
    const start = (currentPage - 1) * limit;
    const items = prods.slice(start, start + limit).map(p => ({
      ...p,
      category: this.getCategoryById(p.category_id),
      variants: this.getProductVariants(p.id).filter(v => v.is_active)
    }));

    return {
      items,
      total,
      currentPage,
      lastPage,
      hasMore: currentPage < lastPage
    };
  }

  getProductById(id) {
    const prod = this.products.get(Number(id));
    if (!prod) return null;
    return {
      ...prod,
      category: this.getCategoryById(prod.category_id),
      variants: this.getProductVariants(prod.id)
    };
  }

  getProductVariants(productId) {
    return Array.from(this.variants.values()).filter(v => v.product_id === Number(productId));
  }

  getVariantById(id) {
    const v = this.variants.get(Number(id));
    if (!v) return null;
    return {
      ...v,
      product: this.products.get(v.product_id)
    };
  }

  findVariantBySku(sku) {
    for (const v of this.variants.values()) {
      if (v.sku === sku) return v;
    }
    return null;
  }

  createProduct({ name, slug, category_id, description, image_index = 1, is_active = true, variants = [] }) {
    const id = this.productIdCounter++;
    const product = {
      id,
      category_id: Number(category_id),
      name: name.trim(),
      slug: slug ? slug.trim() : this.slugify(name),
      description: description ? description.trim() : '',
      image_path: 'products/demo.jpg',
      image_index: Number(image_index) || 1,
      is_active: is_active === true || is_active === '1' || is_active === 'true',
      created_at: new Date()
    };
    this.products.set(id, product);

    // Create variants if provided
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        if (!v.sku) continue;
        const vId = this.variantIdCounter++;
        this.variants.set(vId, {
          id: vId,
          product_id: id,
          sku: v.sku.trim(),
          size: v.size || 'M',
          color: v.color || 'Đen',
          price: Number(v.price) || 150000,
          stock: Number(v.stock) || 10,
          is_active: true,
          created_at: new Date()
        });
      }
    } else {
      // Default standard variants (M/Đen, L/Trắng)
      for (const def of [{ size: 'M', color: 'Đen', bonus: 0 }, { size: 'L', color: 'Trắng', bonus: 10000 }]) {
        const vId = this.variantIdCounter++;
        this.variants.set(vId, {
          id: vId,
          product_id: id,
          sku: `SP-${id}-${def.size}`,
          size: def.size,
          color: def.color,
          price: 150000 + def.bonus,
          stock: 20,
          is_active: true,
          created_at: new Date()
        });
      }
    }

    return this.getProductById(id);
  }

  updateProduct(id, { name, slug, category_id, description, image_index, is_active, variants }) {
    const prod = this.products.get(Number(id));
    if (!prod) return null;

    if (name) prod.name = name.trim();
    if (slug) prod.slug = slug.trim();
    if (category_id) prod.category_id = Number(category_id);
    if (description !== undefined) prod.description = description.trim();
    if (image_index) prod.image_index = Number(image_index);
    if (is_active !== undefined) {
      prod.is_active = is_active === true || is_active === '1' || is_active === 'true';
    }

    // Update variants if provided
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        if (v.id) {
          const existingV = this.variants.get(Number(v.id));
          if (existingV && existingV.product_id === prod.id) {
            if (v.sku) existingV.sku = v.sku.trim();
            if (v.size) existingV.size = v.size;
            if (v.color) existingV.color = v.color;
            if (v.price !== undefined) existingV.price = Number(v.price);
            if (v.stock !== undefined) existingV.stock = Number(v.stock);
            if (v.is_active !== undefined) existingV.is_active = v.is_active === true || v.is_active === '1' || v.is_active === 'true';
          }
        } else if (v.sku) {
          const newVId = this.variantIdCounter++;
          this.variants.set(newVId, {
            id: newVId,
            product_id: prod.id,
            sku: v.sku.trim(),
            size: v.size || 'M',
            color: v.color || 'Đen',
            price: Number(v.price) || 150000,
            stock: Number(v.stock) || 10,
            is_active: true,
            created_at: new Date()
          });
        }
      }
    }

    return this.getProductById(id);
  }

  deleteProduct(id) {
    const numId = Number(id);
    // Delete product variants
    for (const [vId, v] of this.variants.entries()) {
      if (v.product_id === numId) {
        this.variants.delete(vId);
      }
    }
    return this.products.delete(numId);
  }

  // ================= Cart queries =================
  getUserCartItems(userId) {
    const items = Array.from(this.cartItems.values())
      .filter(item => item.user_id === Number(userId));

    return items.map(item => {
      const v = this.getVariantById(item.variant_id);
      return {
        ...item,
        variant: v
      };
    });
  }

  getCartItem(itemId) {
    return this.cartItems.get(Number(itemId)) || null;
  }

  // ================= Orders queries =================
  getUserOrders(userId) {
    return Array.from(this.orders.values())
      .filter(o => o.user_id === Number(userId))
      .sort((a, b) => b.id - a.id);
  }

  getOrderById(id) {
    return this.orders.get(Number(id)) || null;
  }

  getOrderByToken(token) {
    for (const o of this.orders.values()) {
      if (o.checkout_token === token) return o;
    }
    return null;
  }

  getAllOrders() {
    return Array.from(this.orders.values()).sort((a, b) => b.id - a.id);
  }

  // ================= Reviews / Comments =================
  getProductReviews(productId) {
    return Array.from(this.reviews.values())
      .filter(r => r.product_id === Number(productId))
      .sort((a, b) => b.id - a.id);
  }

  addReview(productId, { userName, rating, comment }) {
    const review = {
      id: this.reviewIdCounter++,
      product_id: Number(productId),
      user_name: userName ? userName.trim() : 'Khách hàng',
      rating: Number(rating) || 5,
      comment: comment ? comment.trim() : '',
      created_at: new Date()
    };
    this.reviews.set(review.id, review);
    return review;
  }

  // ================= Showrooms / External Map API =================
  getShowrooms() {
    return [
      {
        id: 1,
        name: 'EShopper Flagship Store — Quận 1',
        address: '68 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        lat: 10.7743,
        lng: 106.7027,
        phone: '028 3822 9999',
        hours: '08:30 – 22:00 (Cả tuần)',
        is_main: true
      },
      {
        id: 2,
        name: 'EShopper Fashion Outlet — Quận 3',
        address: '142 Hai Bà Trưng, Phường Đa Kao, Quận 3, TP. Hồ Chí Minh',
        lat: 10.7831,
        lng: 106.6961,
        phone: '028 3823 8888',
        hours: '09:00 – 21:30 (Cả tuần)',
        is_main: false
      },
      {
        id: 3,
        name: 'EShopper Vincom Plaza — Thủ Đức',
        address: '216 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
        lat: 10.8507,
        lng: 106.7719,
        phone: '028 3722 7777',
        hours: '09:30 – 22:00 (Cả tuần)',
        is_main: false
      },
      {
        id: 4,
        name: 'EShopper Pearl Plaza — Bình Thạnh',
        address: '561A Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh',
        lat: 10.7997,
        lng: 106.7188,
        phone: '028 3512 6666',
        hours: '09:00 – 22:00 (Cả tuần)',
        is_main: false
      }
    ];
  }

  slugify(text) {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export const store = new DataStore();
export default store;
