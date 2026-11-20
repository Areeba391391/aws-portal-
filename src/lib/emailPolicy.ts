/**
 * Portal accounts must use a real personal Gmail address.
 * Blocks placeholder / dummy patterns like a@gmail.com, aaaa@gmail.com, smoke-*@…
 */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

const BLOCKED_LOCALS = new Set([
  "a",
  "b",
  "c",
  "test",
  "testing",
  "dummy",
  "fake",
  "sample",
  "example",
  "user",
  "student",
  "admin",
  "temp",
  "asdf",
  "qwerty",
  "abc",
  "abcd",
  "abcde",
  "aaaa",
  "bbbb",
  "cccc",
  "dddd",
  "smoke",
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isRealGmailAddress(email: string): { ok: true; email: string } | { ok: false; error: string } {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) {
    return { ok: false, error: "Enter a valid Gmail address." };
  }

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  if (!GMAIL_DOMAINS.has(domain)) {
    return { ok: false, error: "Only personal Gmail addresses (@gmail.com) are allowed." };
  }

  // Gmail local parts: letters, digits, dots, plus — keep it strict.
  if (!/^[a-z0-9.]+$/.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return { ok: false, error: "Enter a valid Gmail address." };
  }

  const compact = local.replace(/\./g, "");
  if (compact.length < 5) {
    return { ok: false, error: "Use your real Gmail address (not a short placeholder like a@gmail.com)." };
  }

  if (BLOCKED_LOCALS.has(compact) || BLOCKED_LOCALS.has(local)) {
    return { ok: false, error: "That Gmail looks like a placeholder. Use your real personal Gmail." };
  }

  // Reject repeated single-letter locals: aaaa, bbbb, cccc…
  if (/^([a-z])\1+$/i.test(compact)) {
    return { ok: false, error: "That Gmail looks like a placeholder. Use your real personal Gmail." };
  }

  if (/^(smoke|test|dummy|fake|temp)[-_.0-9]*/i.test(compact)) {
    return { ok: false, error: "That Gmail looks like a placeholder. Use your real personal Gmail." };
  }

  return { ok: true, email: normalized };
}
