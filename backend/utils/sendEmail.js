const getTransporter = () => {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    throw new Error('Email dependency not installed (nodemailer).');
  }

  const {
    SMTP_SERVICE,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS
  } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('Email service is not configured. Missing SMTP_USER or SMTP_PASS.');
  }

  if (SMTP_SERVICE) {
    return nodemailer.createTransport({
      service: SMTP_SERVICE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }

  const port = Number(SMTP_PORT || 587);

  if (!SMTP_HOST) {
    throw new Error('Email service is not configured. Missing SMTP_HOST.');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

exports.sendContactEmail = async ({ name, email, phone, message }) => {
  const transporter = getTransporter();
  const toEmail = process.env.CONTACT_RECEIVER_EMAIL || 'mahendrachandra.sons@gmail.com';
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"MC Sons Website" <${fromEmail}>`,
    to: toEmail,
    replyTo: email,
    subject: `New Contact Message from ${name}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || '-'}`,
      '',
      'Message:',
      message
    ].join('\n'),
    html: `
      <h2>New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || '-'}</p>
      <p><strong>Message:</strong></p>
      <p>${String(message).replace(/\n/g, '<br/>')}</p>
    `
  });
};
