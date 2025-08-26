const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description'],
    trim: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please provide at least one category']
  }],
  // Keep category for backward compatibility (will be populated from first category in categories array)
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  images: [{
    type: String,
    required: [true, 'Please provide at least one product image']
  }],
  price: {
    type: Number,
    required: [true, 'Please provide a rental price'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    required: [true, 'Please provide the original price'],
    min: [0, 'Original price cannot be negative']
  },
  sizes: [{
    size: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: [0, 'Quantity cannot be negative']
    }
  }],
  color: {
    type: String,
    required: [true, 'Please provide a color'],
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  material: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    enum: ['Excellent', 'Very Good', 'Good', 'Fair'],
    default: 'Good'
  },
  rentalDuration: {
    type: Number,
    required: [true, 'Please provide rental duration in days'],
    min: [1, 'Rental duration must be at least 1 day']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  specifications: {
    type: Map,
    of: String
  },
  careInstructions: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    lowercase: true,
    unique: true,
    sparse: true
  },
  views: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Set category from first category in categories array for backward compatibility
productSchema.pre('save', async function(next) {
  if (this.categories && this.categories.length > 0) {
    this.category = this.categories[0];
  }
  next();
});

// Generate slug from name before saving
productSchema.pre('save', async function(next) {
  if (!this.isModified('name')) return next();
  
  let baseSlug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Check if slug already exists
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existingProduct = await this.constructor.findOne({ 
      slug: slug,
      _id: { $ne: this._id } // Exclude current document if updating
    });
    
    if (!existingProduct) {
      break;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  this.slug = slug;
  next();
});

// Index for search functionality
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Unique index for slug
productSchema.index({ slug: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Product', productSchema); 