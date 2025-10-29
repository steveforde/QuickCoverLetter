// ======================================================
//  email.js — Send emails via Gmail (App Password required)
// ======================================================

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// === Send Email Function ===
export const sendEmail = async (to, subject, html) => {
  try {
    // Create a reusable transporter object using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // your Gmail address (e.g., sforde08@gmail.com)
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    // Email details
    const mailOptions = {
      from: `"QuickProCV Support" <${process.env.BRAND_EMAIL}>`, // shows as support@quickprocv.com
      to,
      subject,
      html,
      replyTo: process.env.BRAND_EMAIL, // replies go to support@quickprocv.com
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}: ${info.response}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
};
