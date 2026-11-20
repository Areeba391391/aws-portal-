import { createClient } from "@/lib/supabase/client";

/**
 * Admin/team "see across every student" queries. These rely on the staff
 * RLS policies in supabase/schema.sql (team/admin can select/update/delete
 * every row in enrollments and event_registrations, not just their own).
 */

export interface StoredEnrollment {
  courseId: string;
  enrolledAt: string;
  completedLessonIds: string[];
  quizResults: Record<string, { score: number; total: number; passed: boolean }>;
  certificateIssued: boolean;
  certificateIssuedAt?: string;
  certificateNumber?: string;
  finalAssessmentPassed: boolean;
  finalAssessmentPassedAt?: string;
}

function enrollmentFromRow(row: any): StoredEnrollment {
  return {
    courseId: row.course_id,
    enrolledAt: row.enrolled_at,
    completedLessonIds: row.completed_lesson_ids ?? [],
    quizResults: row.quiz_results ?? {},
    certificateIssued: row.certificate_issued ?? false,
    certificateIssuedAt: row.certificate_issued_at ?? undefined,
    certificateNumber: row.certificate_number ?? undefined,
    finalAssessmentPassed: row.final_assessment_passed ?? false,
    finalAssessmentPassedAt: row.final_assessment_passed_at ?? undefined,
  };
}

/** Every student's enrollments, keyed by student (profile) id. */
export async function readAllEnrollments(): Promise<Record<string, StoredEnrollment[]>> {
  const supabase = createClient();
  const { data } = await supabase.from("enrollments").select("*");
  const out: Record<string, StoredEnrollment[]> = {};
  for (const row of data ?? []) {
    const uid = (row as any).student_id;
    if (!out[uid]) out[uid] = [];
    out[uid].push(enrollmentFromRow(row));
  }
  return out;
}

/** Admin action: unenroll a specific student from a specific course. */
export async function removeEnrollment(userId: string, courseId: string) {
  const supabase = createClient();
  await supabase.from("enrollments").delete().eq("student_id", userId).eq("course_id", courseId);
}

/** Admin action: revoke a previously-issued certificate (progress kept). */
export async function revokeCertificate(userId: string, courseId: string) {
  const supabase = createClient();
  const withAssessment = {
    certificate_issued: false,
    certificate_issued_at: null,
    certificate_number: null,
    final_assessment_passed: false,
    final_assessment_passed_at: null,
  };
  let { error } = await supabase.from("enrollments").update(withAssessment).eq("student_id", userId).eq("course_id", courseId);
  if (error?.message?.includes("final_assessment")) {
    ({ error } = await supabase
      .from("enrollments")
      .update({ certificate_issued: false, certificate_issued_at: null, certificate_number: null })
      .eq("student_id", userId)
      .eq("course_id", courseId));
  }
  if (error) throw error;
}

/** Admin action: mark physical final assessment passed and issue certificate. */
export async function passFinalAssessmentAndIssue(userId: string, courseId: string) {
  const supabase = createClient();
  const certNumber = `AWSSBG-${courseId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const issuedAt = new Date().toISOString();
  const withAssessment = {
    final_assessment_passed: true,
    final_assessment_passed_at: issuedAt,
    certificate_issued: true,
    certificate_issued_at: issuedAt,
    certificate_number: certNumber,
  };
  let { error } = await supabase.from("enrollments").update(withAssessment).eq("student_id", userId).eq("course_id", courseId);
  if (error?.message?.includes("final_assessment")) {
    ({ error } = await supabase
      .from("enrollments")
      .update({
        certificate_issued: true,
        certificate_issued_at: issuedAt,
        certificate_number: certNumber,
      })
      .eq("student_id", userId)
      .eq("course_id", courseId));
  }
  if (error) throw error;
}

/** Admin action: reissue a certificate with a fresh certificate number. */
export async function reissueCertificate(userId: string, courseId: string) {
  const supabase = createClient();
  const certNumber = `AWSSBG-${courseId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  await supabase
    .from("enrollments")
    .update({
      final_assessment_passed: true,
      final_assessment_passed_at: new Date().toISOString(),
      certificate_issued: true,
      certificate_issued_at: new Date().toISOString(),
      certificate_number: certNumber,
    })
    .eq("student_id", userId)
    .eq("course_id", courseId);
}

export interface StoredEventRegistration {
  eventId: string;
  registeredAt: string;
  formResponses?: Record<string, string>;
  teamName?: string;
}

/** Every student's event registrations, keyed by student (profile) id. */
export async function readAllEventRegistrations(): Promise<Record<string, StoredEventRegistration[]>> {
  const supabase = createClient();
  const { data } = await supabase.from("event_registrations").select("*");
  const out: Record<string, StoredEventRegistration[]> = {};
  for (const row of data ?? []) {
    const uid = (row as any).student_id;
    if (!out[uid]) out[uid] = [];
    out[uid].push({
      eventId: (row as any).event_id,
      registeredAt: (row as any).registered_at,
      formResponses: (row as any).form_responses ?? {},
      teamName: (row as any).team_name ?? undefined,
    });
  }
  return out;
}
