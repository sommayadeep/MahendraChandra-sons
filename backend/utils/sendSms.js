const buildSmsMessage = (otp) =>
  `Mahendra Chandra & Sons OTP: ${otp}. Valid for 10 minutes.`;

exports.sendVerificationOtpSms = async ({ phone, otp }) => {
  const apiUrl = process.env.SMS_API_URL || '';
  const apiKey = process.env.SMS_API_KEY || '';
  const sender = process.env.SMS_SENDER || 'MCSons';

  if (!apiUrl || !apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      return { sent: false, devOtp: otp };
    }
    throw new Error('SMS service is not configured. Missing SMS_API_URL or SMS_API_KEY.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      to: phone,
      sender,
      message: buildSmsMessage(otp)
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SMS send failed (${response.status}): ${text || 'Unknown error'}`);
  }

  return { sent: true };
};

