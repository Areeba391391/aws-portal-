"use client";

import { useParams } from "next/navigation";
import { CourseWorkspace } from "@/components/vtms/CourseWorkspace";

export default function AdminTrainingCoursePage() {
  const params = useParams<{ courseId: string }>();
  return <CourseWorkspace courseId={params.courseId} audience="admin" />;
}
