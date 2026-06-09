// Stripe client (test mode) for rider + restaurant tips.
//
// Phase 0 stub. In Phase 5 this instantiates the Stripe SDK from
// STRIPE_SECRET_KEY and exposes PaymentIntent helpers. When no key is present,
// the tip flow falls back to a simulated success so the app runs without Stripe.

export const STRIPE_ENABLED = Boolean(process.env.STRIPE_SECRET_KEY);

export {};
