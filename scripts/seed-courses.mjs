import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const definitions = [
  {
    title: "Build Software with AI",
    category: "Artificial Intelligence",
    description: "Turn an idea into a working application using AI as a planning, coding, testing, and review partner.",
    concepts: ["Define the user problem before choosing tools", "Break features into testable tasks", "Ask AI for options and trade-offs, not blind answers"],
    practice: ["Write a one-page product brief", "Generate a small feature plan", "Build, test, and review one working feature"],
  },
  {
    title: "Prompting Fundamentals",
    category: "Artificial Intelligence",
    description: "Learn the essential structure of clear prompts that produce useful, repeatable results.",
    concepts: ["State role, context, task, constraints, and output format", "Include examples when format matters", "Separate facts from assumptions"],
    practice: ["Rewrite a vague prompt", "Add constraints and acceptance criteria", "Compare outputs and document improvements"],
  },
  {
    title: "Practical Prompt Engineering",
    category: "Artificial Intelligence",
    description: "Design robust prompts for research, coding, analysis, content, and structured workflows.",
    concepts: ["Use decomposition for complex work", "Build reusable prompt templates", "Control output with schemas and rubrics"],
    practice: ["Create a multi-step prompt chain", "Build a reusable coding prompt", "Evaluate consistency across five runs"],
  },
  {
    title: "Testing and Improving AI Prompts",
    category: "Artificial Intelligence",
    description: "Measure whether a prompt works and improve it with test cases instead of guesswork.",
    concepts: ["Define success before testing", "Use normal, edge, and adversarial cases", "Track accuracy, completeness, safety, and format"],
    practice: ["Create a ten-case prompt test set", "Score outputs with a rubric", "Fix the weakest failure mode"],
  },
  {
    title: "AI Tools for Students and Builders",
    category: "Artificial Intelligence",
    description: "Choose and use AI assistants responsibly for study, coding, design, research, and productivity.",
    concepts: ["Match tools to tasks", "Verify citations and generated code", "Never expose secrets or private data"],
    practice: ["Compare three tools on one task", "Verify an AI-generated technical answer", "Create a safe personal AI workflow"],
  },
  {
    title: "Web Development Foundations",
    category: "Web Development",
    description: "Build accessible, responsive web pages using HTML, CSS, JavaScript, and browser fundamentals.",
    concepts: ["Use semantic HTML", "Build responsive layouts", "Understand events, state, and network requests"],
    practice: ["Create a responsive landing page", "Add form validation", "Fetch and display API data"],
  },
  {
    title: "Modern React and Next.js",
    category: "Web Development",
    description: "Build a modern full-stack web interface with reusable components, routing, and server-backed data.",
    concepts: ["Design small reusable components", "Separate server and client responsibilities", "Handle loading, empty, and error states"],
    practice: ["Build a component library", "Create routed pages", "Connect a page to a database-backed API"],
  },
  {
    title: "Android Development Basics",
    category: "Mobile Development",
    description: "Understand Android app structure and build a small application with Kotlin and modern UI principles.",
    concepts: ["Learn activities, navigation, and lifecycle", "Model UI state clearly", "Store and validate user input"],
    practice: ["Build a two-screen app", "Create a validated form", "Persist a simple list locally"],
  },
  {
    title: "Programming and Problem Solving",
    category: "Computer Science",
    description: "Learn variables, control flow, functions, data structures, debugging, and systematic problem solving.",
    concepts: ["Translate problems into inputs, steps, and outputs", "Choose suitable data structures", "Debug by testing one assumption at a time"],
    practice: ["Solve three small algorithm problems", "Trace a program by hand", "Debug a broken function with test cases"],
  },
  {
    title: "Technical Thinking for Builders",
    category: "Computer Science",
    description: "Learn how engineers clarify requirements, compare solutions, manage complexity, and make defensible decisions.",
    concepts: ["Ask what problem is actually being solved", "Identify constraints and risks", "Prefer simple designs that can evolve"],
    practice: ["Write assumptions for a sample project", "Compare two architectures", "Create a decision record"],
  },
  {
    title: "Git and GitHub Essentials",
    category: "Developer Tools",
    description: "Use version control confidently for personal projects and team collaboration.",
    concepts: ["Understand commits, branches, merges, and remotes", "Write focused commits", "Review changes before sharing"],
    practice: ["Create and clone a repository", "Build a feature branch", "Open and review a pull request"],
  },
  {
    title: "Cloud Computing Fundamentals",
    category: "Cloud",
    description: "Understand cloud concepts, service models, regions, availability, scalability, security, and cost.",
    concepts: ["Compare IaaS, PaaS, and SaaS", "Design for failure and elasticity", "Use shared responsibility correctly"],
    practice: ["Map a local app to cloud services", "Identify reliability risks", "Estimate major cost drivers"],
  },
  {
    title: "AWS Cloud Essentials",
    category: "AWS",
    description: "Learn the core AWS global infrastructure and the services every beginner should recognize.",
    concepts: ["Understand Regions, Availability Zones, and edge locations", "Recognize IAM, EC2, S3, Lambda, RDS, and VPC", "Apply least privilege and cost awareness"],
    practice: ["Design a basic AWS web architecture", "Create an IAM least-privilege checklist", "Choose services for three sample workloads"],
  },
  {
    title: "Cybersecurity Basics for Builders",
    category: "Security",
    description: "Protect accounts, applications, data, and users with practical security fundamentals.",
    concepts: ["Use strong authentication and least privilege", "Validate input and protect secrets", "Understand common web attacks"],
    practice: ["Threat-model a student portal", "Audit a repository for exposed secrets", "Write secure input-validation rules"],
  },
  {
    title: "Workplace Ethics and Corporate Readiness",
    category: "Professional Skills",
    description: "Develop professional communication, ownership, teamwork, ethics, and responsible workplace behavior.",
    concepts: ["Communicate clearly and respectfully", "Own outcomes and raise risks early", "Protect confidentiality and avoid conflicts of interest"],
    practice: ["Write a professional project update", "Respond to an ethical scenario", "Prepare a first-week workplace checklist"],
  },
];

function makeSyllabus(course, courseIndex) {
  const slug = `seed-${courseIndex + 1}`;
  return [
    {
      id: `${slug}-m1`,
      title: "Core Concepts",
      description: `The essential ideas behind ${course.title}.`,
      order: 1,
      status: "Active",
      lessons: course.concepts.map((content, index) => ({
        id: `${slug}-m1-l${index + 1}`,
        title: content,
        type: "reading",
        durationMinutes: 8,
        content: `${content}.\n\nStudy this idea by connecting it to a real project. Write down one example, one risk, and one question before continuing.`,
      })),
      quiz: [
        {
          id: `${slug}-m1-q1`,
          question: `What is the best way to apply concepts from ${course.title}?`,
          options: ["Memorize terms only", "Apply them to a small verified project", "Skip testing", "Copy an answer without review"],
          correctIndex: 1,
        },
      ],
    },
    {
      id: `${slug}-m2`,
      title: "Guided Practice",
      description: "Apply the concepts and reflect on the result.",
      order: 2,
      status: "Active",
      lessons: course.practice.map((content, index) => ({
        id: `${slug}-m2-l${index + 1}`,
        title: content,
        type: "lab",
        durationMinutes: 12,
        content: `Goal: ${content}.\n\n1. Define the expected result.\n2. Complete the task in small steps.\n3. Test the result.\n4. Record what failed and what you changed.\n5. Summarize the lesson in three sentences.`,
      })),
      quiz: [
        {
          id: `${slug}-m2-q1`,
          question: "What should you do before calling a technical task complete?",
          options: ["Assume it works", "Test it against clear acceptance criteria", "Hide failed attempts", "Add unnecessary complexity"],
          correctIndex: 1,
        },
      ],
    },
  ];
}

const { data: existing, error: readError } = await supabase.from("courses").select("title");
if (readError) throw readError;
const existingTitles = new Set((existing ?? []).map((course) => course.title.toLowerCase()));

const rows = definitions
  .filter((course) => !existingTitles.has(course.title.toLowerCase()))
  .map((course, index) => {
    const syllabus = makeSyllabus(course, index);
    return {
      title: course.title,
      description: course.description,
      level: "Beginner",
      modules: syllabus.length,
      icon: course.category === "AWS" || course.category === "Cloud" ? "Cloud" : "BookOpen",
      status: "Active",
      category: course.category,
      instructor: "AWS SBG Learning Team",
      duration_hours: 1.5,
      certificate_enabled: true,
      syllabus,
    };
  });

if (rows.length === 0) {
  console.log("All 15 seed courses already exist.");
  process.exit(0);
}

const { error: insertError } = await supabase.from("courses").insert(rows);
if (insertError) throw insertError;
console.log(`Inserted ${rows.length} courses.`);
