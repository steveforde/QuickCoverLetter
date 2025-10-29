import nodemailer from "nodemailer";
import dotenv from 'dotenv'; // 👈 Re-importing dotenv
dotenv.config(); // 👈 Initializing dotenv to read .env file

export const sendEmail = async (to, subject, html) => {
  try {
    // 💡 Logging the user just before connection attempt
    console.log(`[EMAIL] Using Brevo user: ${process.env.BREVO_USER ? process.env.BREVO_USER.substring(0, 4) + '...' : 'MISSING'}`);

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER, // your Brevo SMTP login
        pass: process.env.BREVO_PASS, // the long password
      },
    });

    // Check connection validity
    await transporter.verify();
    console.log('✅ SMTP connection verified (Auth success)');

    const mailOptions = {
      // It's best practice to use the EMAIL_USER variable if available, 
      // but hardcoding the address you confirmed you want to use is fine for now.
      from: '"QuickProCV Support" <support@quickprocv.com>',
      to,
      subject,
      html,
      replyTo: "support@quickprocv.com",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return info;
  } catch (error) {
    // We now throw the error so index.js can catch it and log it as a 500 failure
    console.error("❌ Email send failed:", error);
    throw error;
  }
};



