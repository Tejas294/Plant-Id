import { NextResponse } from "next/server";
import { pool } from "../../utils/db";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const { email } = await req.json();

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.error("OTP send failed: EMAIL_USER or EMAIL_PASS is not configured.");
    return NextResponse.json(
      {
        success: false,
        message:
          "Email credentials are not configured. Please set EMAIL_USER and EMAIL_PASS.",
      },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  try {
    const otp = generateOTP();

    await pool.query(
      "INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')",
      [email, otp]
    );

    // Read the email template
    const templatePath = path.join(
      process.cwd(),
      "email-templates",
      "otp-template.html"
    );
    let emailTemplate = await fs.readFile(templatePath, "utf8");

    // Replace the OTP placeholder
    emailTemplate = emailTemplate.replace("{OTP}", otp);

    await transporter.sendMail({
      from: '"Plant Club" <noreply@plantiden.com>',
      to: email,
      subject: "Your Plant Club Registration OTP",
      html: emailTemplate,
    });

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
