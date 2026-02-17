const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      default: 0
    }
  }],
  orderItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  shippingDetails: {
    name: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      default: ''
    }
  },
  shippingAddress: {
    fullName: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      default: ''
    }
  },
  phone: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    default: 'COD',
    enum: ['COD']
  },
  paymentStatus: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'Paid']
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  orderStatus: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'Accepted', 'Shipped', 'Delivered', 'Cancelled', 'Processing']
  },
  trackingId: {
    type: String,
    default: ''
  },
  returnExchangeRequests: [{
    requestType: {
      type: String,
      enum: ['Return', 'Exchange'],
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected', 'Completed'],
      default: 'Requested'
    },
    customerUid: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  shippedAt: Date,
  deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function(next) {
  if (!this.totalAmount && this.totalPrice) {
    this.totalAmount = this.totalPrice;
  }

  if (!this.totalPrice && this.totalAmount) {
    this.totalPrice = this.totalAmount;
  }

  if ((!this.items || this.items.length === 0) && this.orderItems && this.orderItems.length > 0) {
    this.items = this.orderItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price || 0
    }));
  }

  if ((!this.orderItems || this.orderItems.length === 0) && this.items && this.items.length > 0) {
    this.orderItems = this.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price || 0,
      name: '',
      image: ''
    }));
  }

  if ((!this.shippingDetails || !this.shippingDetails.address) && this.shippingAddress) {
    this.shippingDetails = {
      name: this.shippingAddress.fullName || '',
      phone: this.phone || '',
      address: this.shippingAddress.address || '',
      city: this.shippingAddress.city || '',
      pincode: this.shippingAddress.pincode || ''
    };
  }

  if ((!this.shippingAddress || !this.shippingAddress.address) && this.shippingDetails) {
    this.shippingAddress = {
      fullName: this.shippingDetails.name || 'Customer',
      address: this.shippingDetails.address || '-',
      city: this.shippingDetails.city || '-',
      state: this.shippingAddress?.state || '-',
      pincode: this.shippingDetails.pincode || '-'
    };
  }

  if (!this.phone && this.shippingDetails?.phone) {
    this.phone = this.shippingDetails.phone;
  }

  next();
});

module.exports = mongoose.model('Order', orderSchema);
