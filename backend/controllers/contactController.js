const ContactMessage = require('../models/ContactMessage');
const { sendContactEmail } = require('../utils/sendEmail');

// @desc    Create contact message
// @route   POST /api/contact
// @access  Public
exports.createContactMessage = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      message
    });

    let emailSent = true;
    try {
      await sendContactEmail({ name, email, phone, message });
    } catch (emailError) {
      emailSent = false;
      console.error('Contact email delivery failed:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Message sent successfully'
        : 'Message received successfully, but email notification failed',
      emailSent,
      contactMessageId: contactMessage._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
