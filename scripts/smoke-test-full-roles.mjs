/**
 * Full portal smoke test (public + admin + team + student).
 * Uses existing DB accounts. Does not create dummy Gmail signups.
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

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRV = env.SUPABASE_SERVICE_ROLE_KEY;
const PASS = "PortalTest!2026";
const COURSE = "1b448bf4-6b9d-4c61-88e3-7c394ca54b45";

const accounts = {
  admin: { email: "admin@awssbg.com", role: "admin" },
  team: { email: "cccc@gmail.com", role: "team" },
  student: { email: "a@gmail.com", role: "student" },
};

const results = [];
const log = (ok, area, name, detail = "") => {
  results.push({ ok, area, name, detail: String(detail).slice(0, 220) });
  console.log(`${ok ? "PASS" : "FAIL"} [${area}] ${name}${detail ? " — " + String(detail).slice(0, 150) : ""}`);
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

async function loginApp(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASS }),
  });
  return { res, jar: parseCookies(res), body: await res.json().catch(() => ({})) };
}

async function sbToken(email) {
  const res = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASS }),
  });
  const j = await res.json();
  return { ok: res.ok, token: j.access_token, user: j.user, error: j };
}

async function rest(token, method, path, body) {
  const res = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "count=exact" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}
  return { res, text, data };
}

async function page(area, route, jar, expectStatus, locIncludes) {
  const res = await fetch(`${BASE}${route}`, {
    redirect: "manual",
    headers: jar ? { Cookie: cookieHeader(jar) } : {},
  });
  const loc = res.headers.get("location") || "";
  let ok = res.status === expectStatus;
  if (locIncludes) ok = ok && loc.includes(locIncludes);
  log(ok, area, `PAGE ${route}`, `status=${res.status} loc=${loc}`);
}

async function api(area, method, route, jar, body, expectStatus) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(jar ? { Cookie: cookieHeader(jar) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  log(res.status === expectStatus, area, `API ${method} ${route}`, `status=${res.status} ${text.slice(0, 120)}`);
  return { res, text };
}

async function testPublic() {
  const area = "public";
  for (const r of ["/", "/courses", `/courses/${COURSE}`, "/events", "/resources", "/about", "/contact", "/login", "/request-credentials", "/request-status", "/forgot-password", "/hackathons"]) {
    await page(area, r, null, 200);
  }
  await page(area, "/register", null, 307, "/request-credentials");
  await page(area, "/dashboard/admin", null, 307, "/login");
  await page(area, "/dashboard/team", null, 307, "/login");
  await page(area, "/dashboard/student", null, 307, "/login");

  await api(area, "POST", "/api/credential-requests", null, {
    fullName: "Dummy",
    email: "a@gmail.com",
    departmentSession: "CS",
    studyYear: "1st Year",
  }, 400);

  await api(area, "POST", "/api/credential-requests", null, {
    fullName: "Dummy",
    email: "bbbb@gmail.com",
    departmentSession: "CS",
    studyYear: "1st Year",
  }, 400);

  const badLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: accounts.admin.email, password: "wrong" }),
  });
  log(badLogin.status === 401, area, "bad password rejected", `status=${badLogin.status}`);
}

async function testRole(roleKey) {
  const area = roleKey;
  const acct = accounts[roleKey];
  const { res, jar, body } = await loginApp(acct.email);
  log(res.status === 200 && body?.user?.role === acct.role, area, "login", `status=${res.status} role=${body?.user?.role}`);
  if (res.status !== 200) return null;

  const routes = {
    admin: [
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
    ],
    team: [
      "/dashboard/team",
      "/dashboard/team/members",
      "/dashboard/team/events",
      "/dashboard/team/resources",
      "/dashboard/team/announcements",
      "/dashboard/team/reports",
      "/dashboard/team/training",
      `/dashboard/team/training/${COURSE}`,
    ],
    student: [
      "/dashboard/student",
      "/dashboard/student/courses",
      "/dashboard/student/events",
      "/dashboard/student/resources",
      "/dashboard/student/certificates",
      "/dashboard/student/settings",
      "/dashboard/student/training",
      `/dashboard/student/training/${COURSE}`,
      `/dashboard/student/learn/${COURSE}`,
    ],
  };

  for (const route of routes[roleKey]) await page(area, route, jar, 200);

  for (const other of ["admin", "team", "student"].filter((r) => r !== acct.role)) {
    await page(area, `/dashboard/${other}`, jar, 307, `/dashboard/${acct.role}`);
  }

  if (roleKey === "admin") {
    await api(area, "GET", "/api/admin/credential-requests", jar, null, 200);
  } else {
    await api(area, "GET", "/api/admin/credential-requests", jar, null, 403);
    await api(area, "POST", "/api/admin/users", jar, { fullName: "x", email: "nobody@gmail.com" }, 403);
  }
  return jar;
}

async function testVtms() {
  const area = "vtms";
  const admin = await sbToken(accounts.admin.email);
  const team = await sbToken(accounts.team.email);
  const student = await sbToken(accounts.student.email);
  log(admin.ok && team.ok && student.ok, area, "supabase tokens");

  const c = await rest(admin.token, "GET", `courses?id=eq.${COURSE}&select=id,title,lifecycle_status`);
  log(c.res.status === 200 && c.data?.[0]?.title, area, "read course", c.data?.[0]?.title);

  const task = await rest(team.token, "POST", "course_tasks", {
    course_id: COURSE,
    title: `QA task ${Date.now()}`,
    description: "Temporary QA task — will delete",
    marks: 10,
  });
  const taskId = Array.isArray(task.data) ? task.data[0]?.id : task.data?.id;
  log(task.res.status === 201 && !!taskId, area, "team create task", task.res.status);

  let subId = null;
  if (taskId) {
    const sub = await rest(student.token, "POST", "task_submissions", {
      task_id: taskId,
      student_id: student.user.id,
      content: "QA submission",
      status: "submitted",
    });
    subId = Array.isArray(sub.data) ? sub.data[0]?.id : sub.data?.id;
    log(sub.res.status === 201 && !!subId, area, "student submit task", sub.res.status);
  }

  if (subId) {
    const rev = await rest(team.token, "PATCH", `task_submissions?id=eq.${subId}`, {
      status: "reviewed",
      feedback: "QA ok",
      score: 10,
    });
    log(rev.res.status === 200, area, "team review task", rev.res.status);
  }

  const proj = await rest(team.token, "POST", "course_projects", {
    course_id: COURSE,
    title: `QA project ${Date.now()}`,
    description: "Temporary QA project",
  });
  const projectId = Array.isArray(proj.data) ? proj.data[0]?.id : proj.data?.id;
  log(proj.res.status === 201 && !!projectId, area, "team create project", proj.res.status);

  let psubId = null;
  if (projectId) {
    const psub = await rest(student.token, "POST", "project_submissions", {
      project_id: projectId,
      student_id: student.user.id,
      content: "QA project submission",
      status: "submitted",
    });
    psubId = Array.isArray(psub.data) ? psub.data[0]?.id : psub.data?.id;
    log(psub.res.status === 201 && !!psubId, area, "student submit project", psub.res.status);
  }

  if (psubId) {
    const prev = await rest(team.token, "PATCH", `project_submissions?id=eq.${psubId}`, {
      status: "approved",
      supervisor_feedback: "QA approved",
    });
    log(prev.res.status === 200, area, "team approve project", prev.res.status);

    const act = await rest(team.token, "POST", "supervisor_activity", {
      course_id: COURSE,
      student_id: student.user.id,
      supervisor_id: team.user.id,
      activity_type: "project_reviewed",
      summary: "QA supervisor note",
      related_id: psubId,
    });
    log(act.res.status === 201, area, "supervisor activity", act.res.status);
  }

  const exam = await rest(team.token, "POST", "examinations", {
    course_id: COURSE,
    title: "QA Exam",
    instructions: "QA only",
  });
  const examId = Array.isArray(exam.data) ? exam.data[0]?.id : exam.data?.id;
  log(exam.res.status === 201 && !!examId, area, "team create examination", exam.res.status);

  const apply = await rest(student.token, "POST", "exam_applications", {
    course_id: COURSE,
    student_id: student.user.id,
    status: "applied",
  });
  // eligibility gate may block — either 201 or business-rule 400 is acceptable behavior
  log(apply.res.status === 201 || (apply.res.status === 400 && /eligible/i.test(apply.text)), area, "exam apply gate", `${apply.res.status} ${apply.text.slice(0, 80)}`);

  const ann = await rest(admin.token, "POST", "announcements", {
    title: `QA ann ${Date.now()}`,
    message: "QA announcement",
    is_active: false,
    created_by: admin.user.id,
  });
  const annId = Array.isArray(ann.data) ? ann.data[0]?.id : ann.data?.id;
  log(ann.res.status === 201 && !!annId, area, "admin announcement", ann.res.status);

  const rpc = await fetch(`${SB}/rest/v1/rpc/exam_is_eligible`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${student.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_course: COURSE, p_student: student.user.id }),
  });
  log(rpc.status === 200, area, "exam_is_eligible rpc", `${rpc.status} ${await rpc.text()}`);

  // cleanup QA rows
  const sh = { apikey: SRV, Authorization: `Bearer ${SRV}` };
  if (subId) await fetch(`${SB}/rest/v1/task_submissions?id=eq.${subId}`, { method: "DELETE", headers: sh });
  if (taskId) await fetch(`${SB}/rest/v1/course_tasks?id=eq.${taskId}`, { method: "DELETE", headers: sh });
  if (psubId) await fetch(`${SB}/rest/v1/project_submissions?id=eq.${psubId}`, { method: "DELETE", headers: sh });
  if (projectId) await fetch(`${SB}/rest/v1/course_projects?id=eq.${projectId}`, { method: "DELETE", headers: sh });
  if (examId) await fetch(`${SB}/rest/v1/examinations?id=eq.${examId}`, { method: "DELETE", headers: sh });
  if (annId) await fetch(`${SB}/rest/v1/announcements?id=eq.${annId}`, { method: "DELETE", headers: sh });
  await fetch(`${SB}/rest/v1/supervisor_activity?summary=eq.QA supervisor note`, { method: "DELETE", headers: sh });
  await fetch(`${SB}/rest/v1/exam_applications?student_id=eq.${student.user.id}&course_id=eq.${COURSE}`, { method: "DELETE", headers: sh });
  log(true, area, "cleanup QA rows");
}

async function main() {
  console.log("BASE", BASE);
  console.log("SB", SB);
  await testPublic();
  await testRole("admin");
  await testRole("team");
  await testRole("student");
  await testVtms();

  const failed = results.filter((r) => !r.ok);
  console.log("\n==== SUMMARY ====");
  console.log(`PASS ${results.length - failed.length}  FAIL ${failed.length}  TOTAL ${results.length}`);
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(` - [${f.area}] ${f.name}: ${f.detail}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
