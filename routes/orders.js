const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.rentalDuration').isInt({ min: 1 }).withMessage('Rental duration must be at least 1 day'),
  body('shippingAddress.name').notEmpty().withMessage('Shipping name is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Shipping phone is required'),
  body('shippingAddress.street').notEmpty().withMessage('Shipping street is required'),
  body('shippingAddress.city').notEmpty().withMessage('Shipping city is required'),
  body('shippingAddress.state').notEmpty().withMessage('Shipping state is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Shipping zip code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Shipping country is required'),
  body('paymentMethod').isIn(['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery']).withMessage('Valid payment method is required'),
  body('rentalStartDate').isISO8601().withMessage('Valid rental start date is required'),
  body('rentalEndDate').isISO8601().withMessage('Valid rental end date is required'),
  body('needDate').isISO8601().withMessage('Valid need date is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      items,
      shippingAddress,
      paymentMethod,
      rentalStartDate,
      rentalEndDate,
      needDate,
      notes
    } = req.body;

    // Validate rental dates
    const startDate = new Date(rentalStartDate);
    const endDate = new Date(rentalEndDate);
    const needDateObj = new Date(needDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Rental start date cannot be in the past'
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Rental end date must be after start date'
      });
    }

    if (needDateObj < today) {
      return res.status(400).json({
        success: false,
        message: 'Need date cannot be in the past'
      });
    }

    // Always 1 day rental duration
    const rentalDuration = 1;

    // Validate and calculate order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (!product.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`
        });
      }

      // Always use 1 day rental duration
      const itemTotal = product.price * item.quantity * 1;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        rentalDuration: 1, // Always 1 day
        price: product.price,
        totalPrice: itemTotal
      });
    }

    // Calculate shipping and tax (you can customize these calculations)
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const tax = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + shippingCost + tax;

    const order = new Order({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
      needDate: needDateObj,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      notes
    });

    await order.save();

    // Populate product details for response
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name images price');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order: populatedOrder }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  }
});

// @route   POST /api/orders/guest
// @desc    Create new order for guest users (no authentication required)
// @access  Public
router.post('/guest', [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.rentalDuration').isInt({ min: 1 }).withMessage('Rental duration must be at least 1 day'),
  body('shippingAddress.name').notEmpty().withMessage('Shipping name is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Shipping phone is required'),
  body('shippingAddress.street').notEmpty().withMessage('Shipping street is required'),
  body('shippingAddress.city').notEmpty().withMessage('Shipping city is required'),
  body('shippingAddress.state').notEmpty().withMessage('Shipping state is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Shipping zip code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Shipping country is required'),
  body('paymentMethod').isIn(['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery']).withMessage('Valid payment method is required'),
  body('rentalStartDate').isISO8601().withMessage('Valid rental start date is required'),
  body('rentalEndDate').isISO8601().withMessage('Valid rental end date is required'),
  body('needDate').isISO8601().withMessage('Valid need date is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      items,
      shippingAddress,
      paymentMethod,
      rentalStartDate,
      rentalEndDate,
      needDate,
      notes
    } = req.body;

    // Validate rental dates
    const startDate = new Date(rentalStartDate);
    const endDate = new Date(rentalEndDate);
    const needDateObj = new Date(needDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Rental start date cannot be in the past'
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Rental end date must be after start date'
      });
    }

    if (needDateObj < today) {
      return res.status(400).json({
        success: false,
        message: 'Need date cannot be in the past'
      });
    }

    // Always 1 day rental duration
    const rentalDuration = 1;

    // Validate and calculate order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (!product.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`
        });
      }

      // Always use 1 day rental duration
      const itemTotal = product.price * item.quantity * 1;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        rentalDuration: 1, // Always 1 day
        price: product.price,
        totalPrice: itemTotal
      });
    }

    // Calculate shipping and tax (you can customize these calculations)
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const tax = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + shippingCost + tax;

    const order = new Order({
      user: null, // No user for guest orders
      items: orderItems,
      shippingAddress,
      paymentMethod,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
      needDate: needDateObj,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      notes,
      isGuestOrder: true // Mark as guest order
    });

    await order.save();

    // Populate product details for response
    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name images price');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order: populatedOrder }
    });
  } catch (error) {
    console.error('Create guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  }
});

// @route   GET /api/orders
// @desc    Get user orders (for regular users) or all orders (for admins)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sort = 'createdAt', order = 'desc' } = req.query;
    
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    let filter = {};
    
    // If user is not admin, only show their orders
    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    }

    // Add status filter if provided
    if (status) {
      filter.orderStatus = status;
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('items.product', 'name images price')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @route   GET /api/orders/stats/summary
// @desc    Get order statistics (admin only)
// @access  Private/Admin
router.get('/stats/summary', protect, admin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'Pending' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'Cancelled' });

    // Calculate total revenue
    const revenueData = await Order.aggregate([
      { $match: { orderStatus: { $in: ['Delivered', 'Paid'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          totalRevenue
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order statistics'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name images price originalPrice size color brand');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user can access this order
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (admin only)
// @access  Private/Admin
router.put('/:id/status', protect, admin, [
  body('orderStatus').isIn(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Returned', 'Cancelled']).withMessage('Valid order status is required'),
  body('paymentStatus').optional().isIn(['Pending', 'Paid', 'Failed', 'Refunded']).withMessage('Valid payment status is required'),
  body('adminNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { orderStatus, paymentStatus, adminNotes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status
    order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (adminNotes) order.adminNotes = adminNotes;

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name images price');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order (user can cancel pending orders, admin can cancel any)
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user can cancel this order
    if (req.user.role !== 'admin' && order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['Pending', 'Confirmed'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled in its current status'
      });
    }

    order.orderStatus = 'Cancelled';
    if (req.user.role === 'admin') {
      order.adminNotes = req.body.adminNotes || 'Order cancelled by admin';
    }

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name images price');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling order'
    });
  }
});

module.exports = router; 