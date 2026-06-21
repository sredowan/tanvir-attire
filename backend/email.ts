import nodemailer from 'nodemailer';
import type { Order } from '../src/types';
import { ENV, isSmtpConfigured } from './env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE, // true for 465, false for 587 (STARTTLS)
    auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
  });
  return transporter;
}

function money(n: number, currency: string): string {
  return `$${n.toFixed(2)} ${currency}`;
}

function orderHtml(order: Order): string {
  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${it.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${it.size}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${it.sku || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${money(it.price * it.quantity, order.currency)}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#06211E;">
    <div style="background:#06211E;color:#E6B579;padding:24px;text-align:center;">
      <h1 style="margin:0;letter-spacing:3px;font-size:20px;">TANVIR ATTIRE</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#cbb48f;">New Paid Order — ${order.referenceId}</p>
    </div>
    <div style="padding:24px;border:1px solid #eee;border-top:none;">
      <p style="font-size:14px;">A new order has been <strong>paid</strong> and is ready to fulfil.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
        <tr><td style="padding:4px 0;color:#888;">Reference</td><td style="text-align:right;font-weight:bold;">${order.referenceId}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Status</td><td style="text-align:right;font-weight:bold;">${order.status}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Customer</td><td style="text-align:right;">${order.customerName || '—'}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Email</td><td style="text-align:right;">${order.customerEmail || '—'}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Phone</td><td style="text-align:right;">${order.customerPhone || '—'}</td></tr>
        <tr><td style="padding:4px 0;color:#888;vertical-align:top;">Address</td><td style="text-align:right;">${(order.customerAddress || '—').replace(/\n/g, '<br>')}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#faf7f2;color:#06211E;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;">Size</th>
            <th style="padding:8px 12px;">SKU</th>
            <th style="padding:8px 12px;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
        <tr><td style="padding:4px 0;color:#888;">Subtotal</td><td style="text-align:right;">${money(order.subtotal, order.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Shipping (${order.shippingMethod})</td><td style="text-align:right;">${money(order.shippingFee, order.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">GST included</td><td style="text-align:right;">${money(order.gstIncluded, order.currency)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;font-size:15px;border-top:2px solid #06211E;">Total Paid</td><td style="text-align:right;font-weight:bold;font-size:15px;border-top:2px solid #06211E;">${money(order.total, order.currency)}</td></tr>
      </table>
    </div>
  </div>`;
}

/** Send a new-order notification to the configured recipients. Never throws. */
export async function sendNewOrderEmail(order: Order): Promise<void> {
  const tx = getTransporter();
  const to = ENV.ORDER_NOTIFY_TO;
  if (!tx) {
    console.log(`[email] SMTP not configured — would notify ${to} of paid order ${order.referenceId} (${order.total} ${order.currency}).`);
    return;
  }
  try {
    await tx.sendMail({
      from: ENV.MAIL_FROM,
      to,
      subject: `🧾 New Paid Order ${order.referenceId} — ${order.total.toFixed(2)} ${order.currency}`,
      html: orderHtml(order),
    });
    console.log(`[email] New-order notification sent to ${to} for ${order.referenceId}.`);
  } catch (err) {
    console.error('[email] Failed to send new-order notification:', err);
  }
}
