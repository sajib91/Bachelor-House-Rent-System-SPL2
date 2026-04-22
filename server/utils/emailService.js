// backend/utils/emailService.js
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' }); // Ensure .env from backend root is loaded

const sendEmail = async (options) => {
  let transporter;

  // For development, use Ethereal.email (or Mailtrap, etc.)
  if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
        // Use Ethereal credentials directly for testing
    transporter = nodemailer.createTransport({
      host: process.env.ETHEREAL_HOST,
      port: parseInt(process.env.ETHEREAL_PORT || "587", 10),
      secure: process.env.ETHEREAL_SECURE === 'true', // Ethereal usually uses TLS on port 587
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Often needed for local/development SMTP servers
      }
    });

  } else {
    // For production, use a real email service (e.g., SendGrid, Mailgun, Gmail - with caution)
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports (like 587 with STARTTLS)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Add other options like TLS for production if necessary
      tls: {
                // If you use Mailgun's SMTP on port 587 with STARTTLS, this might not be strictly needed,
                // but can be helpful for debugging connectivity issues if you face any.
                // For production, ensure your SSL/TLS certificates are valid.
                rejectUnauthorized: false
      }
    });
  }

  // Define email options
  const mailOptions = {
    // Use environment variables for the 'from' address
    from: `"${process.env.EMAIL_FROM_NAME || 'To-Let Globe'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@sandboxa76c076d96ef4ffb96c0afbcbbc1886a.mailgun.org'}>`, // Explicit Ethereal sender
    to: options.email,       // Recipient's email address
    subject: options.subject,  // Subject line
    text: options.text,        // Plain text body (optional)
    html: options.html,        // HTML body
  };

  // --- ADD THIS CONSOLE.LOG LINE ---
    console.log(`Attempting to send email TO: ${mailOptions.to}`);
    // --- END OF ADDITION ---

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);

    // Preview URL for Ethereal emails (only relevant in development)
    if (transporter.options.host.includes('ethereal.email')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent.');
  }
};

module.exports = sendEmail;