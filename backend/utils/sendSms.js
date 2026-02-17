const buildSmsMessage = (otp) =>
  `Mahendra Chandra & Sons OTP: ${otp}. Valid for 10 minutes.`;

exports.sendVerificationOtpSms = async ({ phone, otp }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

  if (!accountSid || !authToken || !fromNumber) {
    if (process.env.NODE_ENV !== 'production') {
      return { sent: false, devOtp: otp };
    }
    throw new Error('SMS service is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER.');
  }

  let twilioClientFactory;
  try {
    twilioClientFactory = require('twilio');
  } catch (error) {
    throw new Error('Twilio package is missing. Run npm install in backend service.');
  }

  const client = twilioClientFactory(accountSid, authToken);
  await client.messages.create({
    body: buildSmsMessage(otp),
    from: fromNumber,
    to: phone.startsWith('+') ? phone : `+91${phone}`
  });

  return { sent: true };
};
