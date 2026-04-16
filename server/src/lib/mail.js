import nodemailer from 'nodemailer';

/** Supports SMTP_PASSWORD (common naming mismatch). */
function smtpPassword() {
  const raw = process.env.SMTP_PASSWORD;
  return raw?.trim().replace(/^["']|["']$/g, '') || '';
}

export function isSmtpConfigured() {
  const host = process.env.SMTP_HOST?.trim().replace(/^["']|["']$/g, '') || '';
  const user = process.env.SMTP_USER?.trim().replace(/^["']|["']$/g, '') || '';
  return Boolean(host && user && smtpPassword());
}

function createTransport() {
  if (!isSmtpConfigured()) return null;
  const host = process.env.SMTP_HOST.trim().replace(/^["']|["']$/g, '');
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER.trim().replace(/^["']|["']$/g, ''),
      pass: smtpPassword()
    }
  });
}

/**
 * @param {string} to
 * @param {string} resetUrl
 * @returns {Promise<{ ok: boolean, error?: Error }>}
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const transport = createTransport();
  if (!transport) {
    return { ok: false, error: new Error('SMTP not configured') };
  }
  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER.trim().replace(/^["']|["']$/g, '');
  const appName = process.env.APP_NAME?.trim() || 'DSA Tracker';
  const safeHref = resetUrl.replace(/"/g, '%22');
  try {
    await transport.sendMail({
      from,
      to,
      subject: `${appName} — reset your password`,
      text: `You asked to reset your password.\n\nOpen this link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>You asked to reset your password.</p><p><a href="${safeHref}">Reset your password</a></p><p>This link is valid for about one hour.</p><p>If you did not request this, you can ignore this email.</p>`
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
