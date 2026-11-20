const FALLBACK_SITE_URL = "https://aws-sbg-portal-ten.vercel.app";

function normalize(url: string) {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Absolute origin for links that leave the app (invitation and activation emails).
 * The incoming request wins so a preview deployment links to itself, and a
 * localhost value is never used to build a link for someone else's inbox.
 */
export function resolveSiteOrigin(request?: Request) {
  const headers = request?.headers;
  const forwardedHost = headers?.get("x-forwarded-host") ?? headers?.get("host");
  const forwardedProto = headers?.get("x-forwarded-proto") ?? "https";

  if (forwardedHost && !forwardedHost.startsWith("localhost") && !forwardedHost.startsWith("127.0.0.1")) {
    return normalize(`${forwardedProto}://${forwardedHost}`);
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return normalize(configured);
  }

  // Local development: linking to localhost is correct here, but only here.
  if (forwardedHost && process.env.NODE_ENV !== "production") {
    return normalize(`http://${forwardedHost}`);
  }

  return FALLBACK_SITE_URL;
}

/**
 * Activation link hosted on our own domain. It carries the Supabase one-time
 * token hash directly, so it does not depend on the project's "Site URL"
 * redirect allow-list being configured.
 */
export function buildActivationLink(origin: string, tokenHash: string, type: "invite" | "recovery") {
  return `${origin}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
}
