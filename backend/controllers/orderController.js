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
    totalPrice: order.totalPrice || totalAmount,
    returnExchangeRequests: (order.returnExchangeRequests || []).map((request) => ({
      ...request,
      _id: request._id
    }))
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

    const returnExchangeSummary = await Order.aggregate([
      { $match: { 'returnExchangeRequests.0': { $exists: true } } },
      { $unwind: '$returnExchangeRequests' },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          requestedRequests: {
            $sum: {
              $cond: [{ $eq: ['$returnExchangeRequests.status', 'Requested'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const totalReturnsExchanges = returnExchangeSummary[0]?.totalRequests || 0;
    const requestedReturnsExchanges = returnExchangeSummary[0]?.requestedRequests || 0;

    res.json({
      success: true,
      analytics: {
        totalOrders,
        pendingOrders,
        acceptedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        monthlyOrders,
        totalReturnsExchanges,
        requestedReturnsExchanges
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

// @desc    Request return or exchange
// @route   POST /api/orders/:id/return-exchange
// @access  Private
exports.requestReturnOrExchange = async (req, res) => {
  try {
    const {
      requestType,
      reason,
      refundMode,
      upiId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      requestedProductName,
      requestedColor,
      requestedProductPrice
    } = req.body;
    if (!['Return', 'Exchange'].includes(requestType)) {
      return res.status(400).json({ success: false, message: 'Invalid request type' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (String(order.user) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Return/Exchange is available only for delivered orders'
      });
    }

    const activeRequest = (order.returnExchangeRequests || []).find((item) =>
      ['Requested', 'Approved'].includes(item.status)
    );
    if (activeRequest) {
      return res.status(400).json({
        success: false,
        message: 'An active return/exchange request already exists for this order'
      });
    }

    var refundDetails = {
      refundMode: 'UPI',
      upiId: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: ''
    };
    var exchangeDetails = {
      requestedProductName: '',
      requestedColor: '',
      requestedProductPrice: 0,
      previousOrderAmount: Number(order.totalAmount || order.totalPrice || 0),
      extraPayable: 0
    };

    if (requestType === 'Return') {
      const mode = ['UPI', 'Bank'].includes(refundMode) ? refundMode : 'UPI';
      const cleanedUpiId = String(upiId || '').trim();
      const cleanedAccountHolderName = String(accountHolderName || '').trim();
      const cleanedAccountNumber = String(accountNumber || '').trim();
      const cleanedIfscCode = String(ifscCode || '').trim().toUpperCase();
      const cleanedBankName = String(bankName || '').trim();

      if (mode === 'UPI' && !cleanedUpiId) {
        return res.status(400).json({
          success: false,
          message: 'UPI ID is required'
        });
      }

      if (
        mode === 'Bank' &&
        (!cleanedAccountHolderName || !cleanedAccountNumber || !cleanedIfscCode || !cleanedBankName)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Complete bank details are required'
        });
      }

      refundDetails = {
        refundMode: mode,
        upiId: mode === 'UPI' ? cleanedUpiId : '',
        accountHolderName: mode === 'Bank' ? cleanedAccountHolderName : '',
        accountNumber: mode === 'Bank' ? cleanedAccountNumber : '',
        ifscCode: mode === 'Bank' ? cleanedIfscCode : '',
        bankName: mode === 'Bank' ? cleanedBankName : ''
      };
    }

    if (requestType === 'Exchange') {
      const productName = String(requestedProductName || '').trim();
      const color = String(requestedColor || '').trim();
      const targetPrice = Number(requestedProductPrice || 0);
      const previousAmount = Number(order.totalAmount || order.totalPrice || 0);

      if (!productName) {
        return res.status(400).json({
          success: false,
          message: 'Requested product name is required for exchange'
        });
      }

      if (targetPrice <= previousAmount) {
        return res.status(400).json({
          success: false,
          message: 'Exchange product price must be greater than your previous order amount'
        });
      }

      exchangeDetails = {
        requestedProductName: productName,
        requestedColor: color,
        requestedProductPrice: targetPrice,
        previousOrderAmount: previousAmount,
        extraPayable: Math.max(0, targetPrice - previousAmount)
      };
    }

    order.returnExchangeRequests.push({
      requestType,
      reason: String(reason || '').trim(),
      status: 'Requested',
      customerUid: req.user.id,
      refundDetails,
      exchangeDetails,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: `${requestType} request submitted`,
      order: formatOrder(order)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all return/exchange requests
// @route   GET /api/orders/returns
// @access  Private/Admin
exports.getReturnExchangeRequests = async (req, res) => {
  try {
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 1000)
      : 300;

    const orders = await Order.find({ 'returnExchangeRequests.0': { $exists: true } })
      .select('user shippingDetails phone returnExchangeRequests createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const requests = [];
    for (const order of orders) {
      for (const item of order.returnExchangeRequests || []) {
        requests.push({
          requestId: item._id,
          orderId: order._id,
          customerUid: item.customerUid || String(order.user || ''),
          customerName: order.shippingDetails?.name || '',
          customerPhone: order.shippingDetails?.phone || order.phone || '',
          requestType: item.requestType,
          reason: item.reason || '',
          refundMode: item.refundDetails?.refundMode || 'UPI',
          upiId: item.refundDetails?.upiId || '',
          accountHolderName: item.refundDetails?.accountHolderName || '',
          accountNumber: item.refundDetails?.accountNumber || '',
          ifscCode: item.refundDetails?.ifscCode || '',
          bankName: item.refundDetails?.bankName || '',
          requestedProductName: item.exchangeDetails?.requestedProductName || '',
          requestedColor: item.exchangeDetails?.requestedColor || '',
          requestedProductPrice: item.exchangeDetails?.requestedProductPrice || 0,
          previousOrderAmount: item.exchangeDetails?.previousOrderAmount || 0,
          extraPayable: item.exchangeDetails?.extraPayable || 0,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        });
      }
    }

    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update return/exchange request status
// @route   PUT /api/orders/returns/:requestId/status
// @access  Private/Admin
exports.updateReturnExchangeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Requested', 'Approved', 'Rejected', 'Completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid return/exchange status' });
    }

    const order = await Order.findOne({ 'returnExchangeRequests._id': req.params.requestId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = order.returnExchangeRequests.id(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = status;
    request.updatedAt = new Date();
    await order.save();

    res.json({ success: true, message: 'Return/Exchange request updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
