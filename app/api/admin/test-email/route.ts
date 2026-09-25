import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isAdminRequest } from "@/lib/adminAuth";

const OWNER_EMAIL = process.env.BOOKING_NOTIFY_EMAIL || "atelierkharita@gmail.com";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const smtpHost = process.env.EMAIL_SMTP_HOST?.trim();
  const smtpPort = process.env.EMAIL_SMTP_PORT?.trim();
  const smtpUser = process.env.EMAIL_SMTP_USER?.trim() ?? "";
  const smtpPass = process.env.EMAIL_SMTP_PASS?.trim() ?? "";
  const emailFrom = process.env.EMAIL_FROM?.trim();

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json(
      {
        error: `SMTP is not configured (user: ${smtpUser}, password length: ${smtpPass.length})`,
      },
      { status: 500 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort ?? 587),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: emailFrom || smtpUser,
      to: OWNER_EMAIL,
      subject: "Atelier Kharita test email",
      text: "This is a test email from Atelier Kharita.",
    });

    return NextResponse.json({ sentTo: OWNER_EMAIL });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
