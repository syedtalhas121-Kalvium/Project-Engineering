/**
 * Public identity returned by signup and login.
 *
 * Keep this shape intentionally small. It is safe to serialize into an auth
 * response because it contains identity and routing data only.
 */
export function toAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at ?? user.createdAt
  };
}

/**
 * Public profile returned by GET /auth/me.
 *
 * The subscription tier is presentation context for a refreshed client
 * session; billing identifiers, feature flags, and authorization internals
 * remain server-side.
 */
export function toProfileUser(user) {
  return {
    ...toAuthUser(user),
    subscriptionPlan: user.subscription_plan ?? user.subscriptionPlan
  };
}
