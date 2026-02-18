const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide price'],
    min: [0, 'Price cannot be negative']
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Please provide category'],
    enum: ['handbags', 'trolley-luggage', 'travel-bags', 'backpacks']
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  images: [{
    type: String,
    required: true
  }],
  image: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5']
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    rating: Number,
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for search
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ featured: 1, stock: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
