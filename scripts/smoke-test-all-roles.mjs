/**
 * READ-ONLY smoke test against live Supabase + local Next.
 * Does not insert dummy rows. Run: node scripts/smoke-test-all-roles.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// Compile-free inline checks mirror src/lib/emailPolicy.ts
function isRealGmailAddress(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return { ok: false };
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (!["gmail.com", "googlemail.com"].includes(domain)) return { ok: false };
  if (!/^[a-z0-9.]+$/.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return { ok: false };
  const compact = local.replace(/\./g, "");
  if (compact.length < 5) return { ok: false };
  if (/^([a-z])\1+$/i.test(compact)) return { ok: false };
  if (/^(smoke|test|dummy|fake|temp)[-_.0-9]*/i.test(compact)) return { ok: false };
  return { ok: true, email: normalized };
}

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    })
);

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const SRV = env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
function log(ok, area, name, detail = "") {
  results.push({ ok, area, name, detail: String(detail).slice(0, 220) });
  console.log(`${ok ? "PASS" : "FAIL"} [${area}] ${name}${detail ? " — " + String(detail).slice(0, 160) : ""}`);
}

async function main() {
  const sh = { apikey: SRV, Authorization: `Bearer ${SRV}` };

  log(!isRealGmailAddress("a@gmail.com").ok, "policy", "reject a@gmail.com");
  log(!isRealGmailAddress("aaaa@gmail.com").ok, "policy", "reject aaaa@gmail.com");
  log(!isRealGmailAddress("student@yahoo.com").ok, "policy", "reject non-gmail");
  log(isRealGmailAddress("muhammad.asif@gmail.com").ok, "policy", "accept real gmail");

  // Reject dummy credential request via API
  const bad = await fetch(`${BASE}/api/credential-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Dummy",
      email: "a@gmail.com",
      departmentSession: "CS",
      studyYear: "1st Year",
    }),
  });
  log(bad.status === 400, "public", "reject dummy gmail request", `status=${bad.status} ${await bad.text()}`);

  // Public pages
  for (const route of ["/", "/courses", "/events", "/login", "/request-credentials"]) {
    const r = await fetch(`${BASE}${route}`, { redirect: "manual" });
    log(r.status === 200, "public", `PAGE ${route}`, `status=${r.status}`);
  }

  // Real DB inventory (service role)
  const profiles = await fetch(`${SB}/rest/v1/profiles?select=id,email,role,status&order=created_at.desc`, { headers: sh }).then((r) => r.json());
  const courses = await fetch(`${SB}/rest/v1/courses?select=id,title,status,lifecycle_status`, { headers: sh }).then((r) => r.json());
  const enrollments = await fetch(`${SB}/rest/v1/enrollments?select=id`, { headers: { ...sh, Prefer: "count=exact" } });
  const buckets = await fetch(`${SB}/storage/v1/bucket`, { headers: sh }).then((r) => r.json());

  log(Array.isArray(profiles) && profiles.length > 0, "data", "profiles exist", `count=${profiles.length}`);
  log(Array.isArray(courses) && courses.length > 0, "data", "courses exist", JSON.stringify(courses).slice(0, 120));
  log(enrollments.status === 200 || enrollments.status === 206, "data", "enrollments readable", enrollments.headers.get("content-range") || "");
  log(Array.isArray(buckets) && buckets.some((b) => b.id === "resources"), "data", "storage buckets", Array.isArray(buckets) ? buckets.map((b) => b.id).join(",") : "err");

  const activeReal = (profiles || []).filter((p) => p.status === "Active" && isRealGmailAddress(p.email).ok);
  const activeDummy = (profiles || []).filter((p) => p.status === "Active" && p.email.endsWith("@gmail.com") && !isRealGmailAddress(p.email).ok);
  log(activeDummy.length === 0, "data", "no active dummy gmails", activeDummy.map((p) => p.email).join(",") || "none");
  log(true, "data", "active real gmail profiles", `count=${activeReal.length}`);

  const departmentCol = await fetch(`${SB}/rest/v1/profiles?select=id,department&limit=1`, { headers: sh });
  const deptBody = await departmentCol.text();
  log(departmentCol.status === 200 || departmentCol.status === 206, "schema", "profiles.department column", deptBody.slice(0, 120));

  const failed = results.filter((r) => !r.ok);
  console.log("\n==== SUMMARY ====");
  console.log(`PASS ${results.length - failed.length}  FAIL ${failed.length}  TOTAL ${results.length}`);
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(` - [${f.area}] ${f.name}: ${f.detail}`);
  }

  console.log("\nNOTE: Run scripts/migrate-v8e-gmail-only-and-cleanup.sql in Supabase SQL Editor if schema/cleanup checks fail.");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
