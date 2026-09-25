import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createBooking, type BookingRecord } from "@/lib/bookings";

const OWNER_EMAIL = process.env.BOOKING_NOTIFY_EMAIL || "atelierkharita@gmail.com";

type BookingPayload = {
  name: string;
  phone: string;
  dropOffTime: string;
  services: string[];
  description: string;
  termsAccepted: boolean;
  locale: string;
};

async function sendOwnerNotification(record: BookingRecord, saveError?: unknown) {
  const smtpHost = process.env.EMAIL_SMTP_HOST?.trim();
  const smtpPort = process.env.EMAIL_SMTP_PORT?.trim();
  const smtpUser = process.env.EMAIL_SMTP_USER?.trim();
  const smtpPass = process.env.EMAIL_SMTP_PASS?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn(
      "[bookings] SMTP is not configured (see .env.example) — skipping owner notification email."
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort ?? 587),
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const lines = [
    `New booking received (#${record.id})`,
    "",
    `Name: ${record.name}`,
    `Phone: ${record.phone}`,
    `Drop-off time: ${record.dropOffTime}`,
    `Services: ${record.services.length ? record.services.join(", ") : "None specified"}`,
    `Description: ${record.description || "-"}`,
    `Locale: ${record.locale}`,
    `Submitted at: ${record.createdAt}`,
    ...(saveError ? [`Database save error: ${saveError instanceof Error ? saveError.message : String(saveError)}`] : []),
  ];

  await transporter.sendMail({
    from: emailFrom || smtpUser,
    to: OWNER_EMAIL,
    subject: `New booking from ${record.name}`,
    text: lines.join("\n"),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<BookingPayload> | null;

  if (
    !body ||
    !body.name?.trim() ||
    !body.phone?.trim() ||
    !body.dropOffTime?.trim() ||
    body.termsAccepted !== true
  ) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  const record: BookingRecord = {
    id: randomUUID(),
    name: body.name.trim(),
    phone: body.phone.trim(),
    dropOffTime: body.dropOffTime,
    services: Array.isArray(body.services) ? body.services : [],
    description: body.description?.trim() || "",
    termsAccepted: true,
    status: "received",
    createdAt: new Date().toISOString(),
    locale: body.locale || "en",
  };

  try {
    await createBooking(record);
  } catch (error) {
    console.error("[bookings] Failed to save booking:", error);

    try {
      await sendOwnerNotification(record, error);
    } catch (emailError) {
      console.error("[bookings] Failed to send booking failure notification:", emailError);
    }

    return NextResponse.json({ error: "booking_save_failed" }, { status: 500 });
  }

  try {
    await sendOwnerNotification(record);
  } catch (error) {
    console.error("[bookings] Failed to send owner notification email:", error);
  }

  return NextResponse.json({ id: record.id }, { status: 201 });
}
