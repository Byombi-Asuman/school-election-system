import nodemailer from 'nodemailer';
import { logger } from './logger';

const isConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!isConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<boolean> => {
  const t = getTransporter();

  if (!t) {
    logger.warn(`Email not sent (SMTP not configured): "${subject}" to ${to}`);
    return false;
  }

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || `School Elections <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    logger.info(`Email sent: "${subject}" to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};

export const sendPasswordResetEmail = async (to: string, firstName: string, resetUrl: string) => {
  return sendEmail({
    to,
    subject: 'Reset your School Elections password',
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">Reset your password</h2>
        <p style="color: #475569; line-height: 1.6;">Hi ${firstName},</p>
        <p style="color: #475569; line-height: 1.6;">
          We received a request to reset your School Elections account password. Click the button below to choose a new one.
          This link expires in <strong>1 hour</strong>.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #5a67f7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email — your password will remain unchanged.
        </p>
        <p style="color: #94a3b8; font-size: 13px; word-break: break-all;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });
};

export const sendOtpEmail = async (
  to: string,
  firstName: string,
  username: string,
  code: string,
  validForMinutes: number
) => {
  return sendEmail({
    to,
    subject: 'Your School Elections login code',
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">Your one-time login code</h2>
        <p style="color: #475569; line-height: 1.6;">Hi ${firstName},</p>
        <p style="color: #475569; line-height: 1.6;">
          Your election administrator generated a one-time password so you can log in and vote. This code is valid for
          <strong>${validForMinutes} minutes</strong> and can only be used once.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">Username</p>
          <p style="color: #1e293b; font-size: 18px; font-weight: 700; font-family: monospace; margin: 0 0 16px;">${username}</p>
          <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">One-Time Password</p>
          <p style="color: #5a67f7; font-size: 28px; font-weight: 800; font-family: monospace; letter-spacing: 0.1em; margin: 0;">${code}</p>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          Didn't request this? You can ignore this email — the code will simply expire unused.
        </p>
      </div>
    `,
  });
};
