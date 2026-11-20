import { evaluateExamEligibility, trainingProgress } from "../src/lib/vtmsEligibility.ts";

const rules = { requireTasks: true, requireProjects: true, requireSupervisorReady: true };
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
}

check(
  "blocks incomplete projects",
  evaluateExamEligibility({
    enrolled: true,
    requiredProjectCount: 2,
    approvedProjects: 1,
    taskCount: 1,
    completedTaskCount: 1,
    supervisorReady: true,
    rules,
  }).eligible,
  false
);

check(
  "allows a student who met every rule",
  evaluateExamEligibility({
    enrolled: true,
    requiredProjectCount: 2,
    approvedProjects: 2,
    taskCount: 2,
    completedTaskCount: 2,
    supervisorReady: true,
    rules,
  }),
  { eligible: true, reasons: [] }
);

check(
  "zero tasks does not block eligibility",
  evaluateExamEligibility({
    enrolled: true,
    requiredProjectCount: 2,
    approvedProjects: 2,
    taskCount: 0,
    completedTaskCount: 0,
    supervisorReady: true,
    rules,
  }).eligible,
  true
);

check(
  "a turned-off rule is skipped",
  evaluateExamEligibility({
    enrolled: true,
    requiredProjectCount: 2,
    approvedProjects: 0,
    taskCount: 1,
    completedTaskCount: 0,
    supervisorReady: false,
    rules: { requireTasks: false, requireProjects: false, requireSupervisorReady: false },
  }).eligible,
  true
);

check("empty course is zero, not a placeholder", trainingProgress({ taskTotal: 0, tasksCompleted: 0, requiredProjects: 0, approvedProjects: 0 }), 0);
check(
  "progress uses completed work only",
  trainingProgress({ taskTotal: 2, tasksCompleted: 1, requiredProjects: 2, approvedProjects: 2 }),
  75
);

if (failed > 0) {
  console.error(`${failed} eligibility check(s) failed`);
  process.exit(1);
}
console.log("VTMS eligibility checks passed");
