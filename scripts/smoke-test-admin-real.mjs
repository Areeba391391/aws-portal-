/**
 * Read-mostly functional test for Active admin against live DB.
 * Creates no dummy users. VTMS writes use real course + admin session, then cleans up.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const BASE = "http://localhost:3000";
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRV = env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = "PortalTest!2026";
const ADMIN = "admin@awssbg.com";
const COURSE = "1b448bf4-6b9d-4c61-88e3-7c394ca54b45";

const results = [];
const log = (ok, name, detail = "") => {
  results.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + String(detail).slice(0, 160) : ""}`);
};

function parseCookies(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const jar = {};
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return jar;
}
const cookieHeader = (jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

async function main() {
  // Public
  for (const r of ["/", "/courses", "/login", "/request-credentials", "/events"]) {
    const res = await fetch(BASE + r, { redirect: "manual" });
    log(res.status === 200, `public ${r}`, `status=${res.status}`);
  }
  const guard = await fetch(BASE + "/dashboard/admin", { redirect: "manual" });
  log(guard.status === 307 && (guard.headers.get("location") || "").includes("/login"), "admin requires login");

  // Dummy gmail blocked
  const dummy = await fetch(BASE + "/api/credential-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: "Nope", email: "a@gmail.com", departmentSession: "CS", studyYear: "1st Year" }),
  });
  log(dummy.status === 400, "block dummy gmail request", await dummy.text());

  // Admin login
  const login = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN, password: PASS }),
  });
  const loginBody = await login.json().catch(() => ({}));
  const jar = parseCookies(login);
  log(login.status === 200 && loginBody.user?.role === "admin", "admin login", JSON.stringify(loginBody.user || loginBody));

  // Inactive users blocked at app
  for (const email of ["a@gmail.com", "cccc@gmail.com"]) {
    const r = await fetch(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASS }),
    });
    log(r.status === 403, `inactive blocked ${email}`, `status=${r.status}`);
  }

  if (login.status !== 200) {
    finish();
    return;
  }

  const adminRoutes = [
    "/dashboard/admin",
    "/dashboard/admin/users",
    "/dashboard/admin/courses",
    "/dashboard/admin/enrollments",
    "/dashboard/admin/events",
    "/dashboard/admin/credential-requests",
    "/dashboard/admin/settings",
    "/dashboard/admin/website-cms",
    "/dashboard/admin/reviews",
    "/dashboard/admin/learning-paths",
    "/dashboard/admin/training",
    `/dashboard/admin/training/${COURSE}`,
    `/dashboard/admin/courses/${COURSE}/content`,
  ];
  for (const route of adminRoutes) {
    const res = await fetch(BASE + route, { headers: { Cookie: cookieHeader(jar) }, redirect: "manual" });
    log(res.status === 200, `admin page ${route}`, `status=${res.status}`);
  }
  for (const other of ["/dashboard/team", "/dashboard/student"]) {
    const res = await fetch(BASE + other, { headers: { Cookie: cookieHeader(jar) }, redirect: "manual" });
    log(res.status === 307 && (res.headers.get("location") || "").includes("/dashboard/admin"), `role guard ${other}`);
  }

  const creds = await fetch(BASE + "/api/admin/credential-requests", { headers: { Cookie: cookieHeader(jar) } });
  log(creds.status === 200, "admin list credential requests", `status=${creds.status}`);

  // Live data checks
  const sh = { apikey: SRV, Authorization: `Bearer ${SRV}` };
  const course = await fetch(`${SB}/rest/v1/courses?id=eq.${COURSE}&select=title,status`, { headers: sh }).then((r) => r.json());
  log(course[0]?.title === "AWS Cloud Fundamentals", "real course title", course[0]?.title);

  // Admin JWT VTMS write on real course, then delete
  const tokRes = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN, password: PASS }),
  });
  const tok = await tokRes.json();
  log(!!tok.access_token, "admin supabase token");
  const ah = {
    apikey: ANON,
    Authorization: `Bearer ${tok.access_token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const ann = await fetch(`${SB}/rest/v1/announcements`, {
    method: "POST",
    headers: ah,
    body: JSON.stringify({
      title: "Portal access check",
      message: "Admin functional verification — safe to delete.",
      is_active: false,
      created_by: tok.user.id,
    }),
  });
  const annBody = await ann.json();
  log(ann.status === 201, "admin create announcement", ann.status);
  const annId = Array.isArray(annBody) ? annBody[0]?.id : annBody?.id;
  if (annId) {
    const del = await fetch(`${SB}/rest/v1/announcements?id=eq.${annId}`, { method: "DELETE", headers: ah });
    log(del.status === 204 || del.status === 200, "admin cleanup announcement");
  }

  const task = await fetch(`${SB}/rest/v1/course_tasks`, {
    method: "POST",
    headers: ah,
    body: JSON.stringify({
      course_id: COURSE,
      title: "Admin verify task",
      description: "Temporary verification task",
      marks: 5,
    }),
  });
  const taskBody = await task.json();
  log(task.status === 201, "admin create course task", task.status);
  const taskId = Array.isArray(taskBody) ? taskBody[0]?.id : taskBody?.id;
  if (taskId) {
    const del = await fetch(`${SB}/rest/v1/course_tasks?id=eq.${taskId}`, { method: "DELETE", headers: ah });
    log(del.status === 204 || del.status === 200, "admin cleanup task");
  }

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log("\n==== SUMMARY ====");
  console.log(`PASS ${results.length - failed.length}  FAIL ${failed.length}  TOTAL ${results.length}`);
  if (failed.length) for (const f of failed) console.log(" -", f.name, f.detail);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
