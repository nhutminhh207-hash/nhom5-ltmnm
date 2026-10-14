<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{AuthController, CategoryController, ProductController, CartController, OrderController, FoundationController};

/*
|--------------------------------------------------------------------------
| Web Routes - Hệ thống Thời trang EShopper
|--------------------------------------------------------------------------
| Phân công trách nhiệm:
| - Châu (CN01): Quản lý Danh mục (Categories CRUD) + Layout UI
| - Danh (CN02): Quản lý Sản phẩm & Biến thể (Products & Variants CRUD)
| - Nhựt (CN03 + CN04): Xem danh mục, Tìm kiếm + Giỏ hàng (Cart)
| - Anh Tú (CN05): Đặt hàng & Thanh toán COD (Checkout) + UML Use Case
| - Kiều (CN06 + Auth): Quản lý Đơn hàng (Orders) + Xác thực & Phân quyền
*/

// 1. Cửa hàng công khai (Public Store)
Route::get('/', [FoundationController::class, 'home'])->name('home');
Route::get('/shop', [FoundationController::class, 'shop'])->name('shop.index');
Route::get('/shop/{product}', [FoundationController::class, 'detail'])->name('shop.show');
Route::get('/showrooms', [FoundationController::class, 'showrooms'])->name('showrooms');
Route::get('/bao-cao', [FoundationController::class, 'report'])->name('report');

// 2. Xác thực người dùng (Guest only)
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'loginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login.store');
    Route::get('/register', [AuthController::class, 'registerForm'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1')->name('register.store');
});
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// 3. Khách hàng mua sắm (Role: user)
Route::middleware(['auth', 'role:user'])->group(function () {
    // CN04 - Giỏ hàng (Nhựt)
    Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('/cart', [CartController::class, 'store'])->name('cart.store');
    Route::patch('/cart/{cartItem}', [CartController::class, 'update'])->name('cart.update');
    Route::delete('/cart/{cartItem}', [CartController::class, 'destroy'])->name('cart.destroy');

    // CN05 - Thanh toán (Anh Tú)
    Route::get('/checkout', [OrderController::class, 'checkoutForm'])->name('checkout.index');
    Route::post('/checkout', [OrderController::class, 'checkout'])->name('checkout.store');

    // CN06 - Lịch sử đơn hàng (Kiều)
    Route::get('/orders', [OrderController::class, 'userOrders'])->name('orders.index');
    Route::get('/orders/{order}', [OrderController::class, 'userOrderDetail'])->name('orders.show');
    Route::patch('/orders/{order}/cancel', [OrderController::class, 'cancelOrder'])->name('orders.cancel');
});

// 4. Phân hệ Quản trị viên (Role: admin)
Route::prefix('admin')->name('admin.')->middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/', [FoundationController::class, 'dashboard'])->name('dashboard');

    // CN01 - CRUD Danh mục (Châu)
    Route::resource('categories', CategoryController::class);

    // CN02 - CRUD Sản phẩm & Biến thể (Danh)
    Route::resource('products', ProductController::class);

    // CN06 - Quản trị đơn hàng (Kiều)
    Route::get('/orders', [OrderController::class, 'adminOrders'])->name('orders.index');
    Route::get('/orders/{order}', [OrderController::class, 'adminOrderDetail'])->name('orders.show');
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.update');
});
