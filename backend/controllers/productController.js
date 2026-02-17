const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isRealEnvValue = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return Boolean(v) && !['undefined', 'null', 'your_cloud_name', 'your_cloudinary_api_key', 'your_cloudinary_api_secret'].includes(v);
};

const hasCloudinaryConfig = () =>
  isRealEnvValue(process.env.CLOUDINARY_CLOUD_NAME) &&
  isRealEnvValue(process.env.CLOUDINARY_API_KEY) &&
  isRealEnvValue(process.env.CLOUDINARY_API_SECRET);

const uploadImageToCloudinary = (fileBuffer, originalname = 'product-image') =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: 'mcsons-products',
        resource_type: 'image',
        public_id: `product-${Date.now()}-${String(originalname).split('.')[0]}`
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(fileBuffer).pipe(upload);
  });

const bufferToDataUrl = (file) => {
  if (!file || !file.buffer) return '';
  const mime = file.mimetype || 'image/jpeg';
  return `data:${mime};base64,${file.buffer.toString('base64')}`;
};

const uploadWithFallback = async (file) => {
  if (!file) return '';
  if (!hasCloudinaryConfig()) {
    return bufferToDataUrl(file);
  }

  try {
    const uploaded = await uploadImageToCloudinary(file.buffer, file.originalname);
    return uploaded.secure_url || bufferToDataUrl(file);
  } catch (error) {
    // Keep product creation working even if Cloudinary config is invalid at runtime.
    return bufferToDataUrl(file);
  }
};

const normalizeProductPayload = (body = {}) => {
  const payload = { ...body };
  const hasImage = typeof payload.image === 'string' && payload.image.trim() !== '';
  const hasImages = Array.isArray(payload.images) && payload.images.length > 0;

  if (hasImage && !hasImages) {
    payload.images = [payload.image.trim()];
  }

  if (!hasImage && hasImages) {
    payload.image = payload.images[0];
  }

  if (payload.price !== undefined) payload.price = Number(payload.price);
  if (payload.salePrice !== undefined && payload.salePrice !== '') payload.salePrice = Number(payload.salePrice);
  if (payload.stock !== undefined) payload.stock = Number(payload.stock);
  if (payload.featured !== undefined) payload.featured = String(payload.featured) === 'true';

  return payload;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const { category, sort, search, page = 1, limit = 12 } = req.query;

    let query = {};

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Search products
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort products
    let sortOption = { createdAt: -1 };
    if (sort === 'price-low') {
      sortOption = { price: 1 };
    } else if (sort === 'price-high') {
      sortOption = { price: -1 };
    } else if (sort === 'rating') {
      sortOption = { rating: -1 };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(query);

    const normalizedProducts = products.map((product) => ({
      ...product.toObject(),
      image: product.image || product.images?.[0] || ''
    }));

    res.json({
      success: true,
      products: normalizedProducts,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ featured: true, stock: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(8);

    const normalizedProducts = products.map((product) => ({
      ...product.toObject(),
      image: product.image || product.images?.[0] || ''
    }));

    res.json({
      success: true,
      products: normalizedProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product: {
        ...product.toObject(),
        image: product.image || product.images?.[0] || ''
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const payload = normalizeProductPayload(req.body);

    if (req.file) {
      const imageUrl = await uploadWithFallback(req.file);
      payload.image = imageUrl;
      payload.images = [imageUrl];
    }

    if (!payload.image && (!payload.images || payload.images.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Product image is required'
      });
    }

    const normalizedName = String(payload.name || '').trim();
    const duplicateQuery = {
      category: payload.category,
      name: { $regex: `^${escapeRegExp(normalizedName)}$`, $options: 'i' }
    };

    const existingProduct = await Product.findOne(duplicateQuery);
    if (existingProduct) {
      Object.assign(existingProduct, payload);
      await existingProduct.save();

      return res.json({
        success: true,
        message: 'Existing product updated',
        product: {
          ...existingProduct.toObject(),
          image: existingProduct.image || existingProduct.images?.[0] || ''
        }
      });
    }

    const product = await Product.create(payload);
    res.status(201).json({
      success: true,
      product: {
        ...product.toObject(),
        image: product.image || product.images?.[0] || ''
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const payload = normalizeProductPayload(req.body);

    if (req.file) {
      const imageUrl = await uploadWithFallback(req.file);
      payload.image = imageUrl;
      payload.images = [imageUrl];
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true, context: 'query' }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product: {
        ...product.toObject(),
        image: product.image || product.images?.[0] || ''
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add review to product
// @route   POST /api/products/:id/review
// @access  Private
exports.addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const review = {
      user: req.user.id,
      name: req.user.name,
      rating: Number(rating),
      comment,
      createdAt: Date.now()
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();

    res.json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      { name: 'Handbags', slug: 'handbags', image: '/images/handbags.jpg' },
      { name: 'Trolley Luggage', slug: 'trolley-luggage', image: '/images/trolley.jpg' },
      { name: 'Travel Bags', slug: 'travel-bags', image: '/images/travel.jpg' },
      { name: 'Backpacks', slug: 'backpacks', image: '/images/backpacks.jpg' }
    ];

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
