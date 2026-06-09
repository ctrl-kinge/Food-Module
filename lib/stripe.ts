import Stripe from "stripe";

// Stripe client (test mode) for rider + restaurant tips.
// No-key fallback: when STRIPE_SECRET_KEY is absent, tips are recorded as
// "simulated" so the flow works locally without Stripe.
const key = process.env.STRIPE_SECRET_KEY;

export const STRIPE_ENABLED = Boolean(key);

const stripe = key ? new Stripe(key) : null;

export type TipResult = {
  ok: boolean;
  simulated: boolean;
  paymentIntentId?: string;
  error?: string;
};

/**
 * Charge a tip. In test mode this creates + confirms a PaymentIntent with the
 * `pm_card_visa` test payment method (no card UI needed). Without a key, or for
 * a zero amount, it succeeds as "simulated".
 */
export async function chargeTip(
  amountCents: number,
  description: string,
): Promise<TipResult> {
  if (amountCents <= 0) return { ok: true, simulated: !STRIPE_ENABLED };
  if (!stripe) return { ok: true, simulated: true };

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      description,
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
    return {
      ok: intent.status === "succeeded",
      simulated: false,
      paymentIntentId: intent.id,
    };
  } catch (e) {
    return {
      ok: false,
      simulated: false,
      error: e instanceof Error ? e.message : "Stripe error",
    };
  }
}
