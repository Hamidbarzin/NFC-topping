export const WELCOME_CREDIT_AMOUNT = "45.00";
export const WELCOME_CREDIT_REASON = "Welcome credit";

export type ActivationGiftRow = { activationGiftAmount: string | null };

/** Resolve welcome credit for first activation. Clears preset after apply via caller. */
export function resolveWelcomeCreditForActivation(
  profile: ActivationGiftRow,
): { amount: string; reason: string } | null {
  if (profile.activationGiftAmount != null) {
    const n = Number(profile.activationGiftAmount);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return { amount: n.toFixed(2), reason: WELCOME_CREDIT_REASON };
  }
  return { amount: WELCOME_CREDIT_AMOUNT, reason: WELCOME_CREDIT_REASON };
}
