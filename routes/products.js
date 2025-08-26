const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { protect, admin, optionalAuth } = require('../middleware/auth');
const { uploadMultipleImages, deleteImage } = require('../config/cloudinary');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      minPrice,
      maxPrice,
      size,
      color,
      sort = 'createdAt',
      order = 'desc',
      featured
    } = req.query;

    // Build filter object
    const filter = { isAvailable: true };
    
    if (category) {
      // Support both single category and multiple categories
      filter.$or = [
        { category: category },
        { categories: category }
      ];
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (size) {
      filter['sizes.size'] = size;
    }
    
    if (color) {
      filter.color = { $regex: color, $options: 'i' };
    }
    
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .populate('categories', 'name slug')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments(filter);

    // Increment views for each product
    if (req.user) {
      const productIds = products.map(product => product._id);
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $inc: { views: 1 } }
      );
    }

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
});

// @route   GET /api/products/slug/:slug
// @desc    Get product by slug
// @access  Public
router.get('/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      slug: req.params.slug,
      isAvailable: true 
    }).populate('category', 'name slug')
     .populate('categories', 'name slug');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views
    if (req.user) {
      product.views += 1;
      await product.save();
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
});

// @route   GET /api/products/category/:categoryId
// @desc    Get products by category
// @access  Public
router.get('/category/:categoryId', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = 'createdAt', order = 'desc' } = req.query;
    
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const products = await Product.find({ 
      $or: [
        { category: req.params.categoryId },
        { categories: req.params.categoryId }
      ],
      isAvailable: true 
    })
      .populate('category', 'name slug')
      .populate('categories', 'name slug')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Product.countDocuments({ 
      $or: [
        { category: req.params.categoryId },
        { categories: req.params.categoryId }
      ],
      isAvailable: true 
    });

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('categories', 'name slug');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isAvailable) {
      return res.status(404).json({
        success: false,
        message: 'Product is not available'
      });
    }

    // Increment views
    if (req.user) {
      product.views += 1;
      await product.save();
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private/Admin
router.post('/', protect, admin, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').notEmpty().withMessage('Description is required'),
  body('categories').isArray({ min: 1 }).withMessage('At least one category is required'),
  body('categories.*').isMongoId().withMessage('Valid category ID is required'),
  body('images').isArray({ min: 1 }).withMessage('At least one image is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('originalPrice').isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
  body('sizes').isArray({ min: 1 }).withMessage('At least one size is required'),
  body('sizes.*.size').isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']).withMessage('Valid size is required'),
  body('sizes.*.isAvailable').isBoolean().withMessage('Size availability must be boolean'),
  body('sizes.*.quantity').isInt({ min: 1 }).withMessage('Size quantity must be at least 1'),
  body('color').notEmpty().withMessage('Color is required'),
  body('rentalDuration').isInt({ min: 1 }).withMessage('Rental duration must be at least 1 day'),
  body('condition').optional().isIn(['Excellent', 'Very Good', 'Good', 'Fair']),
  body('brand').optional().trim(),
  body('material').optional().trim(),
  body('tags').optional().isArray(),
  body('careInstructions').optional().trim(),
  body('isFeatured').optional().isBoolean()
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
      name,
      description,
      categories,
      images,
      price,
      originalPrice,
      sizes,
      color,
      rentalDuration,
      condition,
      brand,
      material,
      tags,
      careInstructions,
      isFeatured,
      specifications
    } = req.body;

    // Filter out null/undefined values from categories array
    const filteredCategories = categories.filter(categoryId => categoryId && categoryId !== null && categoryId !== undefined);
    
    // Ensure at least one category is provided
    if (filteredCategories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one category is required'
      });
    }
    
    // Verify all categories exist
    for (const categoryId of filteredCategories) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: `Category with ID ${categoryId} not found`
        });
      }
    }

    // Upload images to Cloudinary
    const uploadedImages = [];
    for (const image of images) {
      if (image.startsWith('data:image')) {
        const uploadResult = await uploadMultipleImages([image], 'products');
        uploadedImages.push(uploadResult[0].url);
      } else {
        uploadedImages.push(image);
      }
    }

    const product = new Product({
      name,
      description,
      categories: filteredCategories,
      images: uploadedImages,
      price,
      originalPrice,
      sizes,
      color,
      rentalDuration,
      condition: condition || 'Good',
      brand,
      material,
      tags: tags || [],
      careInstructions,
      isFeatured: isFeatured || false,
      specifications: specifications || {}
    });

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('categories', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product: populatedProduct }
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'slug') {
        return res.status(400).json({
          success: false,
          message: 'A product with this name already exists. Please use a different name.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Duplicate ${field} value. Please use a different ${field}.`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', protect, admin, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('categories').optional().isArray({ min: 1 }).withMessage('At least one category is required'),
  body('categories.*').optional().isMongoId().withMessage('Valid category ID is required'),
  body('images').optional().isArray({ min: 1 }).withMessage('At least one image is required'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('originalPrice').optional().isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
  body('sizes').optional().isArray({ min: 1 }).withMessage('At least one size is required'),
  body('sizes.*.size').optional().isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']).withMessage('Valid size is required'),
  body('sizes.*.isAvailable').optional().isBoolean().withMessage('Size availability must be boolean'),
  body('sizes.*.quantity').optional().isInt({ min: 1 }).withMessage('Size quantity must be at least 1'),
  body('color').optional().notEmpty().withMessage('Color cannot be empty'),
  body('rentalDuration').optional().isInt({ min: 1 }).withMessage('Rental duration must be at least 1 day'),
  body('condition').optional().isIn(['Excellent', 'Very Good', 'Good', 'Fair']),
  body('isAvailable').optional().isBoolean(),
  body('isFeatured').optional().isBoolean()
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

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify all categories exist if being updated
    if (req.body.categories) {
      // Filter out null/undefined values from categories array
      req.body.categories = req.body.categories.filter(categoryId => categoryId && categoryId !== null && categoryId !== undefined);
      
      // Ensure at least one category is provided
      if (req.body.categories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one category is required'
        });
      }
      
      for (const categoryId of req.body.categories) {
        const categoryExists = await Category.findById(categoryId);
        if (!categoryExists) {
          return res.status(400).json({
            success: false,
            message: `Category with ID ${categoryId} not found`
          });
        }
      }
    }

    // Handle image uploads if provided
    if (req.body.images) {
      const uploadedImages = [];
      for (const image of req.body.images) {
        if (image.startsWith('data:image')) {
          const uploadResult = await uploadMultipleImages([image], 'products');
          uploadedImages.push(uploadResult[0].url);
        } else {
          uploadedImages.push(image);
        }
      }
      req.body.images = uploadedImages;
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name slug')
     .populate('categories', 'name slug');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'slug') {
        return res.status(400).json({
          success: false,
          message: 'A product with this name already exists. Please use a different name.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Duplicate ${field} value. Please use a different ${field}.`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      if (image.includes('cloudinary')) {
        try {
          const publicId = image.split('/').pop().split('.')[0];
          await deleteImage(publicId);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
});

module.exports = router; 