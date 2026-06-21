import Stripe from 'stripe';
import { ENV, isStripeConfigured } from './env';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient;
  if (!isStripeConfigured()) return null;
  try {
    stripeClient = new Stripe(ENV.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });
    return stripeClient;
  } catch (err) {
    console.error('[stripe] Failed to initialise client:', err);
    return null;
  }
}
