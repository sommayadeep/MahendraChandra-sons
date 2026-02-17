const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

const toOrderItems = (items = []) =>
  items.map((item) => ({
    product: item.product?._id || item.product,
    name: item.product?.name || item.name || 'Product',
    price: item.price || 0,
    quantity: item.quantity || 1,
    image: item.product?.image || item.product?.images?.[0] || item.image || ''
  }));

const toItems = (orderItems = []) =>
  orderItems.map((item) => ({
    product: item.product,
    quantity: item.quantity || 1,
    price: item.price || 0
  }));

const normalizeOrderItems = (orderItems = []) =>
  orderItems.map((item) => ({
    product: item.product?._id || item.product,
    name: item.name || item.product?.name || 'Product',
    price: item.price || 0,
    quantity: item.quantity || 1,
    image: item.image || item.product?.image || item.product?.images?.[0] || ''
  }));

const formatOrder = (orderDoc) => {
  const order = typeof orderDoc.toObject === 'function' ? orderDoc.toObject() : orderDoc;
  const normalizedOrderItems =
    Array.isArray(order.orderItems) && order.orderItems.length > 0
      ? normalizeOrderItems(order.orderItems)
      : toOrderItems(order.items || []);
  const normalizedItems =
    Array.isArray(order.items) && order.items.length > 0 ? order.items : toItems(normalizedOrderItems);

  const shippingDetails = {
    name: order.shippingDetails?.name || order.shippingAddress?.fullName || '',
    phone: order.shippingDetails?.phone || order.phone || '',
    address: order.shippingDetails?.address || order.shippingAddress?.address || '',
    city: order.shippingDetails?.city || order.shippingAddress?.city || '',
    pincode: order.shippingDetails?.pincode || order.shippingAddress?.pincode || ''
  };

  const shippingAddress = {
    fullName: order.shippingAddress?.fullName || shippingDetails.name || '',
    address: order.shippingAddress?.address || shippingDetails.address || '',
    city: order.shippingAddress?.city || shippingDetails.city || '',
    state: order.shippingAddress?.state || '',
    pincode: order.shippingAddress?.pincode || shippingDetails.pincode || ''
  };

  const totalAmount =
    typeof order.totalAmount === 'number' && order.totalAmount > 0 ? order.totalAmount : order.totalPrice || 0;

  return {
    ...order,
    userId: order.user?._id || order.user,
    orderItems: normalizedOrderItems,
    items: normalizedItems,
    shippingDetails,
    shippingAddress,
    phone: order.phone || shippingDetails.phone || '',
    totalAmount,
    totalPrice: order.totalPrice || totalAmount
  };
};

const restoreOrderStock = async (order) => {
  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : toItems(order.orderItems || []);
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, shippingDetails, phone, paymentMethod } = req.body;
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const orderItems = [];
    let totalPrice = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;

      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'Some products in cart are no longer available'
        });
      }

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      const effectivePrice =
        typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.price
          ? product.salePrice
          : product.price;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: effectivePrice,
        quantity: cartItem.quantity,
        image: product.image || product.images?.[0] || ''
      });

      totalPrice += effectivePrice * cartItem.quantity;
      product.stock -= cartItem.quantity;
      await product.save();
    }

    const normalizedShippingAddress = {
      fullName: shippingAddress?.fullName || shippingDetails?.name || req.user.name || '',
      address: shippingAddress?.address || shippingDetails?.address || '',
      city: shippingAddress?.city || shippingDetails?.city || '',
      state: shippingAddress?.state || '',
      pincode: shippingAddress?.pincode || shippingDetails?.pincode || ''
    };

    const normalizedPhone = phone || shippingDetails?.phone || '';

    const order = await Order.create({
      user: req.user.id,
      orderItems,
      items: toItems(orderItems),
      shippingAddress: normalizedShippingAddress,
      shippingDetails: {
        name: normalizedShippingAddress.fullName,
        phone: normalizedPhone,
        address: normalizedShippingAddress.address,
        city: normalizedShippingAddress.city,
        pincode: normalizedShippingAddress.pincode
      },
      phone: normalizedPhone,
      paymentMethod: paymentMethod || 'COD',
      totalPrice,
      totalAmount: totalPrice,
      orderStatus: 'Pending'
    });

    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [], updatedAt: Date.now() });

    res.status(201).json({
      success: true,
      order: formatOrder(order)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      orders: orders.map(formatOrder)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name image images')
      .populate('orderItems.product', 'name image images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderUserId = order.user?._id ? order.user._id.toString() : String(order.user);
    if (orderUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      order: formatOrder(order)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/all
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name image images')
      .populate('orderItems.product', 'name image images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Order.countDocuments(query);
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      success: true,
      orders: orders.map(formatOrder),
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const allowedStatuses = ['Pending', 'Accepted', 'Shipped', 'Delivered', 'Cancelled'];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
      await restoreOrderStock(order);
    }

    order.orderStatus = orderStatus;
    if (orderStatus === 'Shipped') {
      order.shippedAt = Date.now();
    }
    if (orderStatus === 'Delivered') {
      order.deliveredAt = Date.now();
    }

    await order.save();

    res.json({
      success: true,
      order: formatOrder(order)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get sales analytics
// @route   GET /api/orders/analytics
// @access  Private/Admin
exports.getOrderAnalytics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'Pending' });
    const acceptedOrders = await Order.countDocuments({ orderStatus: 'Accepted' });
    const shippedOrders = await Order.countDocuments({ orderStatus: 'Shipped' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'Cancelled' });

    const currentYear = new Date().getFullYear();
    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        totalOrders,
        pendingOrders,
        acceptedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        monthlyOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all orders for owner dashboard
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrdersForAdmin = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email phone')
      .populate('items.product', 'name image images')
      .populate('orderItems.product', 'name image images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders: orders.map(formatOrder)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Accept order
// @route   PUT /api/orders/:id/accept
// @access  Private/Admin
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.orderStatus = 'Accepted';
    await order.save();

    res.json({ success: true, order: formatOrder(order) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add tracking ID to order
// @route   PUT /api/orders/:id/tracking
// @access  Private/Admin
exports.updateOrderTracking = async (req, res) => {
  try {
    const { trackingId } = req.body;
    if (!trackingId || !trackingId.trim()) {
      return res.status(400).json({ success: false, message: 'Tracking ID is required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.trackingId = trackingId.trim();
    order.orderStatus = 'Shipped';
    order.shippedAt = Date.now();
    await order.save();

    res.json({ success: true, order: formatOrder(order) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'Cancelled') {
      await restoreOrderStock(order);
    }

    await order.deleteOne();
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get orders by user id
// @route   GET /api/orders/user/:userId
// @access  Private
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ success: true, orders: orders.map(formatOrder) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
