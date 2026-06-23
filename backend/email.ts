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
    <div style="background:#06211E;color:#E6B579;padding:32px;text-align:center;">
      <img src="https://tanvirattire.com.au/logo.png" alt="Tanvir Attire Logo" style="height:48px;width:auto;margin-bottom:12px;display:inline-block;" />
      <h1 style="margin:0;letter-spacing:3px;font-size:20px;font-weight:300;">TANVIR ATTIRE</h1>
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

function customerOrderHtml(order: Order): string {
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
    <div style="background:#06211E;color:#E6B579;padding:32px;text-align:center;">
      <img src="https://tanvirattire.com.au/logo.png" alt="Tanvir Attire Logo" style="height:48px;width:auto;margin-bottom:12px;display:inline-block;" />
      <h1 style="margin:0;letter-spacing:3px;font-size:22px;font-weight:300;">TANVIR ATTIRE</h1>
      <p style="margin:8px 0 0;font-size:12px;color:#cbb48f;letter-spacing:1px;text-transform:uppercase;">Order Confirmation</p>
    </div>
    <div style="padding:24px;border:1px solid #eee;border-top:none;background-color:#ffffff;">
      <p style="font-size:14px;line-height:1.6;color:#333;">Dear ${order.customerName || 'Valued Client'},</p>
      <p style="font-size:14px;line-height:1.6;color:#333;">Thank you for your order with Tanvir Attire. Your transaction has been successfully processed, and our atelier is preparing your selection for dispatch.</p>
      
      <div style="margin:24px 0;padding:16px;background:#faf7f2;border-left:3px solid #E6B579;">
        <h3 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#06211E;">Delivery Details</h3>
        <p style="margin:4px 0;font-size:13px;color:#444;"><strong>Recipient:</strong> ${order.customerName}</p>
        <p style="margin:4px 0;font-size:13px;color:#444;"><strong>Address:</strong> ${(order.customerAddress || '—').replace(/\n/g, '<br>')}</p>
        <p style="margin:4px 0;font-size:13px;color:#444;"><strong>Phone:</strong> ${order.customerPhone}</p>
        <p style="margin:4px 0;font-size:13px;color:#444;"><strong>Reference ID:</strong> ${order.referenceId}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#06211E;color:#E6B579;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;text-align:center;">Size</th>
            <th style="padding:8px 12px;text-align:center;">SKU</th>
            <th style="padding:8px 12px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
        <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td style="text-align:right;">${money(order.subtotal, order.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Shipping (${order.shippingMethod})</td><td style="text-align:right;">${money(order.shippingFee, order.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">GST included (10%)</td><td style="text-align:right;">${money(order.gstIncluded, order.currency)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;font-size:15px;border-top:2px solid #06211E;color:#06211E;">Total Paid</td><td style="text-align:right;font-weight:bold;font-size:15px;border-top:2px solid #06211E;color:#06211E;">${money(order.total, order.currency)}</td></tr>
      </table>

      <div style="margin-top:32px;border-top:1px solid #eee;padding-top:16px;font-size:11px;color:#666;text-align:center;">
        <p>If you have any questions, please contact our support team at <a href="mailto:info@tanvirattire.com.au" style="color:#E6B579;text-decoration:none;">info@tanvirattire.com.au</a> or call +61 491 143 581.</p>
        <p style="margin-top:8px;">&copy; ${new Date().getFullYear()} Tanvir Attire. All rights reserved.</p>
      </div>
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

/** Send an order confirmation to the customer. Never throws. */
export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  const tx = getTransporter();
  const to = order.customerEmail;
  if (!to) {
    console.log(`[email] No customer email provided for order ${order.referenceId} — skipping confirmation email.`);
    return;
  }
  if (!tx) {
    console.log(`[email] SMTP not configured — would send confirmation to customer ${to} for order ${order.referenceId}.`);
    return;
  }
  try {
    await tx.sendMail({
      from: ENV.MAIL_FROM,
      to,
      replyTo: 'info@tanvirattire.com.au',
      subject: `Order Confirmed: ${order.referenceId} — Tanvir Attire`,
      html: customerOrderHtml(order),
    });
    console.log(`[email] Order confirmation sent to customer ${to} for ${order.referenceId}.`);
  } catch (err) {
    console.error('[email] Failed to send customer order confirmation:', err);
  }
}

function orderUpdateHtml(order: Order): string {
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

  let statusDescription = 'Your order has been updated.';
  if (order.status === 'Refunded') {
    statusDescription = 'A refund has been successfully processed for this transaction. The funds will return to your account depending on your banking institution\'s processing times.';
  } else if (order.status === 'Cancelled') {
    statusDescription = 'Your order has been cancelled and any charged funds have been returned.';
  } else if (order.status === 'Paid') {
    statusDescription = 'Your transaction is complete and paid. Our atelier is processing the items for dispatch.';
  }

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#06211E;">
    <div style="background:#06211E;color:#E6B579;padding:32px;text-align:center;">
      <img src="https://tanvirattire.com.au/logo.png" alt="Tanvir Attire Logo" style="height:48px;width:auto;margin-bottom:12px;display:inline-block;" />
      <h1 style="margin:0;letter-spacing:3px;font-size:22px;font-weight:300;">TANVIR ATTIRE</h1>
      <p style="margin:8px 0 0;font-size:12px;color:#cbb48f;letter-spacing:1px;text-transform:uppercase;">Order Status Update</p>
    </div>
    <div style="padding:24px;border:1px solid #eee;border-top:none;background-color:#ffffff;">
      <p style="font-size:14px;line-height:1.6;color:#333;">Dear ${order.customerName || 'Valued Client'},</p>
      <p style="font-size:14px;line-height:1.6;color:#333;">The status of your order <strong>${order.referenceId}</strong> has been updated to: <span style="background:#E6B579;color:#06211E;padding:2px 8px;font-weight:bold;text-transform:uppercase;font-size:12px;border-radius:2px;">${order.status}</span>.</p>
      <p style="font-size:14px;line-height:1.6;color:#555;font-style:italic;">${statusDescription}</p>
      
      <div style="margin:24px 0;padding:16px;background:#faf7f2;border-left:3px solid #E6B579;">
        <h3 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#06211E;">Delivery details</h3>
        <p style="margin:4px 0;font-size:13px;color:#444;"><strong>Recipient:</strong> ${order.customerName}</p>
        <p style="margin:4px 0;font-size:13px;color:#444;"><strong>Address:</strong> ${(order.customerAddress || '—').replace(/\n/g, '<br>')}</p>
        <p style="margin:4px 0;font-size:13px;color:#444;"><strong>Phone:</strong> ${order.customerPhone}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#06211E;color:#E6B579;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;text-align:center;">Size</th>
            <th style="padding:8px 12px;text-align:center;">SKU</th>
            <th style="padding:8px 12px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
        <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td style="text-align:right;">${money(order.subtotal, order.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Shipping (${order.shippingMethod})</td><td style="text-align:right;">${money(order.shippingFee, order.currency)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">GST included (10%)</td><td style="text-align:right;">${money(order.gstIncluded, order.currency)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;font-size:15px;border-top:2px solid #06211E;color:#06211E;">Total Paid</td><td style="text-align:right;font-weight:bold;font-size:15px;border-top:2px solid #06211E;color:#06211E;">${money(order.total, order.currency)}</td></tr>
      </table>

      <div style="margin-top:32px;border-top:1px solid #eee;padding-top:16px;font-size:11px;color:#666;text-align:center;">
        <p>If you have any questions, please contact our support team at <a href="mailto:info@tanvirattire.com.au" style="color:#E6B579;text-decoration:none;">info@tanvirattire.com.au</a> or call +61 491 143 581.</p>
        <p style="margin-top:8px;">&copy; ${new Date().getFullYear()} Tanvir Attire. All rights reserved.</p>
      </div>
    </div>
  </div>`;
}

/** Send an order status update email to the customer. Never throws. */
export async function sendOrderStatusUpdateEmail(order: Order): Promise<void> {
  const tx = getTransporter();
  const to = order.customerEmail;
  if (!to) {
    console.log(`[email] No customer email provided for order ${order.referenceId} — skipping status update email.`);
    return;
  }
  if (!tx) {
    console.log(`[email] SMTP not configured — would send status update to customer ${to} for order ${order.referenceId}.`);
    return;
  }
  try {
    await tx.sendMail({
      from: ENV.MAIL_FROM,
      to,
      replyTo: 'info@tanvirattire.com.au',
      subject: `Order Updated: ${order.referenceId} — Status: ${order.status}`,
      html: orderUpdateHtml(order),
    });
    console.log(`[email] Order status update email sent to customer ${to} for ${order.referenceId} (${order.status}).`);
  } catch (err) {
    console.error('[email] Failed to send order status update email:', err);
  }
}
