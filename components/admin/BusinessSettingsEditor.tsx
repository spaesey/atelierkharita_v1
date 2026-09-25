"use client";

import { useState } from "react";
import type { BusinessSettings } from "@/lib/settings";

function TextField({
  label,
  value,
  onChange,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-800 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-neutral-800">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export default function BusinessSettingsEditor({ initial }: { initial: BusinessSettings }) {
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [testEmailStatus, setTestEmailStatus] = useState<
    | { state: "idle" | "sending" }
    | { state: "success"; message: string }
    | { state: "error"; message: string }
  >({ state: "idle" });

  function update(patch: Partial<BusinessSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
    setStatus("idle");
  }

  function updateSocial(patch: Partial<BusinessSettings["social"]>) {
    setSettings((prev) => ({ ...prev, social: { ...prev.social, ...patch } }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  async function handleTestEmail() {
    setTestEmailStatus({ state: "sending" });
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { sentTo?: string; error?: string } | null;
      if (!res.ok) {
        setTestEmailStatus({ state: "error", message: data?.error || "Failed to send test email" });
        return;
      }
      setTestEmailStatus({ state: "success", message: `Sent to ${data?.sentTo || "the configured recipient"}` });
    } catch (error) {
      setTestEmailStatus({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="التواصل">
        <TextField
          label="رقم الهاتف"
          value={settings.phone}
          onChange={(value) => update({ phone: value })}
          hint="اكتبه بالصيغة المعتادة، مثل 06 44469920 — سيتحول تلقائيًا إلى رابط اتصال قابل للنقر على الموقع."
        />
        <TextField
          label="رقم السجل التجاري (KVK)"
          value={settings.kvk}
          onChange={(value) => update({ kvk: value })}
        />
      </Section>

      <Section title="مواقع الاستلام">
        <TextField
          label="الموقع الأول"
          value={settings.location1}
          onChange={(value) => update({ location1: value })}
          hint="سيظهر كنص قابل للنقر يفتح خرائط جوجل مباشرة."
        />
        <TextField
          label="الموقع الثاني"
          value={settings.location2}
          onChange={(value) => update({ location2: value })}
        />
        <TextField
          label="رابط تضمين خرائط جوجل"
          value={settings.mapEmbedUrl}
          onChange={(value) => update({ mapEmbedUrl: value })}
          hint="في خرائط جوجل: مشاركة ← تضمين خريطة ← نسخ HTML، ثم الصق المقطع كاملاً هنا (أو الرابط فقط). اتركه فارغًا لعرض مربع بديل بدلاً من ذلك."
        />
      </Section>

      <Section title="وسائل التواصل الاجتماعي">
        <TextField
          label="رابط إنستغرام"
          value={settings.social.instagram}
          onChange={(value) => updateSocial({ instagram: value })}
          hint="اتركه فارغًا (أو #) لإخفاء الأيقونة على الموقع إلى أن يتوفر رابط حقيقي."
        />
        <TextField
          label="رابط تيك توك"
          value={settings.social.tiktok}
          onChange={(value) => updateSocial({ tiktok: value })}
          hint="اتركه فارغًا (أو #) لإخفاء الأيقونة على الموقع إلى أن يتوفر رابط حقيقي."
        />
        <TextField
          label="رابط فيسبوك"
          value={settings.social.facebook}
          onChange={(value) => updateSocial({ facebook: value })}
          hint="اتركه فارغًا (أو #) لإخفاء الأيقونة على الموقع إلى أن يتوفر رابط حقيقي."
        />
        <TextField
          label="رابط واتساب"
          value={settings.social.whatsapp}
          onChange={(value) => updateSocial({ whatsapp: value })}
          hint="استخدم رابط wa.me، مثل https://wa.me/31644469920. اتركه فارغًا (أو #) لإخفاء الأيقونة."
        />
      </Section>

      <Section title="اختبار البريد الإلكتروني">
        <p className="text-sm leading-6 text-neutral-500">
          أرسل رسالة قصيرة إلى عنوان إشعارات الحجوزات الحالي للتأكد من إعدادات SMTP.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testEmailStatus.state === "sending"}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testEmailStatus.state === "sending" ? "جارٍ الإرسال…" : "إرسال رسالة اختبار"}
          </button>
          {testEmailStatus.state === "success" && (
            <span className="text-sm font-semibold text-green-600">{testEmailStatus.message}</span>
          )}
          {testEmailStatus.state === "error" && (
            <span className="text-sm font-semibold text-red-600">{testEmailStatus.message}</span>
          )}
        </div>
      </Section>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-full border border-neutral-200 bg-white/95 p-2 ps-5 shadow-lg backdrop-blur">
        <span className="text-sm text-neutral-500">
          هذه البيانات تُستخدم في جميع اللغات دفعة واحدة — لا حاجة لتكرارها.
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="ms-auto shrink-0 rounded-full bg-accent px-6 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "saving" ? "جارٍ الحفظ…" : "حفظ التغييرات"}
        </button>
        {status === "saved" && <span className="shrink-0 text-sm font-semibold text-green-600">تم الحفظ</span>}
        {status === "error" && <span className="shrink-0 text-sm font-semibold text-red-600">تعذّر الحفظ</span>}
      </div>
    </div>
  );
}
