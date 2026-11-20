export interface ExamRules {
  requireTasks: boolean;
  requireProjects: boolean;
  requireSupervisorReady: boolean;
}

export interface EligibilityInput {
  enrolled: boolean;
  requiredProjectCount: number;
  approvedProjects: number;
  taskCount: number;
  completedTaskCount: number;
  supervisorReady: boolean;
  rules: ExamRules;
}

export const defaultExamRules: ExamRules = {
  requireTasks: true,
  requireProjects: true,
  requireSupervisorReady: true,
};

export function examRulesFromJson(value: unknown): ExamRules {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    requireTasks: typeof raw.requireTasks === "boolean" ? raw.requireTasks : true,
    requireProjects: typeof raw.requireProjects === "boolean" ? raw.requireProjects : true,
    requireSupervisorReady: typeof raw.requireSupervisorReady === "boolean" ? raw.requireSupervisorReady : true,
  };
}

/** Mirrors public.exam_is_eligible in scripts/migrate-v7-vtms.sql. */
export function evaluateExamEligibility(input: EligibilityInput) {
  const reasons: string[] = [];
  if (!input.enrolled) reasons.push("Enrol in this course first.");
  if (input.rules.requireProjects && input.approvedProjects < input.requiredProjectCount) {
    reasons.push(`Approved projects: ${input.approvedProjects} of ${input.requiredProjectCount} required.`);
  }
  if (input.rules.requireTasks && input.taskCount > 0 && input.completedTaskCount < input.taskCount) {
    reasons.push(`Tasks completed: ${input.completedTaskCount} of ${input.taskCount}.`);
  }
  if (input.rules.requireSupervisorReady && !input.supervisorReady) {
    reasons.push("Your supervisor has not confirmed examination readiness.");
  }
  return { eligible: reasons.length === 0, reasons };
}

export function trainingProgress(input: {
  taskTotal: number;
  tasksCompleted: number;
  requiredProjects: number;
  approvedProjects: number;
}) {
  const parts: number[] = [];
  if (input.taskTotal > 0) parts.push(input.tasksCompleted / input.taskTotal);
  if (input.requiredProjects > 0) parts.push(Math.min(1, input.approvedProjects / input.requiredProjects));
  if (parts.length === 0) return 0;
  return Math.round((parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100);
}
