/**
 * Login is enabled by default so the password you set during card activation works on `/login`.
 * Set `VITE_DISABLE_LOGIN=true` in `.env` to hide sign-in (dashboard still works via token after activation).
 */
export function isLoginEnabled(): boolean {
  return import.meta.env.VITE_DISABLE_LOGIN !== "true";
}
