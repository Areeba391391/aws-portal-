import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
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

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function lessonContent(title, body) {
  return `${title}\n\n${body}\n\nReflect: write one takeaway, one open question, and one way you would use this in a real student project.`;
}

function makeModule(slug, order, title, description, lessons, quizQuestion) {
  return {
    id: `${slug}-m${order}`,
    title,
    description,
    order,
    status: "Active",
    lessons: lessons.map((lesson, index) => ({
      id: `${slug}-m${order}-l${index + 1}`,
      title: lesson.title,
      type: lesson.type,
      durationMinutes: lesson.durationMinutes,
      content: lessonContent(lesson.title, lesson.content),
    })),
    quiz: [
      {
        id: `${slug}-m${order}-q1`,
        question: quizQuestion,
        options: [
          "Skip testing and move on",
          "Apply the concept to a small verified example",
          "Memorize definitions only",
          "Copy an answer without understanding",
        ],
        correctIndex: 1,
      },
      {
        id: `${slug}-m${order}-q2`,
        question: "What should you do before calling a module complete?",
        options: [
          "Assume it works",
          "Test against clear acceptance criteria",
          "Hide failed attempts",
          "Add unnecessary complexity",
        ],
        correctIndex: 1,
      },
    ],
  };
}

function makeSyllabus(course, slug) {
  const modules = [
    {
      title: "Core Concepts",
      description: `Foundational ideas for ${course.title}.`,
      lessons: course.concepts.map((item) => ({
        title: item.title,
        type: "reading",
        durationMinutes: 10,
        content: item.body,
      })),
      quiz: `Which approach best reinforces concepts from ${course.title}?`,
    },
    {
      title: "Guided Practice",
      description: "Hands-on tasks with clear outcomes.",
      lessons: course.practice.map((item) => ({
        title: item.title,
        type: "lab",
        durationMinutes: 15,
        content: item.body,
      })),
      quiz: `How should you validate practice work in ${course.title}?`,
    },
    {
      title: "Applied Projects",
      description: "Build something useful end-to-end.",
      lessons: course.projects.map((item) => ({
        title: item.title,
        type: "lab",
        durationMinutes: 20,
        content: item.body,
      })),
      quiz: `What makes a project submission strong in ${course.title}?`,
    },
    {
      title: "Review & Final Assessment Prep",
      description: "Consolidate learning before the physical final assessment arranged by AWS SBG.",
      lessons: course.review.map((item) => ({
        title: item.title,
        type: "reading",
        durationMinutes: 12,
        content: item.body,
      })),
      quiz: `What is required to earn the certificate for ${course.title}?`,
    },
  ];

  return modules.map((module, index) =>
    makeModule(slug, index + 1, module.title, module.description, module.lessons, module.quiz)
  );
}

function topic(title, body) {
  return { title, body };
}

const beginnerCourses = [
  {
    title: "Build Software with AI",
    category: "Artificial Intelligence",
    description: "Turn an idea into a working application using AI as a planning, coding, testing, and review partner.",
    concepts: [
      topic("Define the problem before tools", "Start with the user, constraints, and success criteria. AI helps most when the goal is clear."),
      topic("Break work into testable tasks", "Split features into small deliverables you can verify in under an hour."),
      topic("Use AI for options and trade-offs", "Ask for alternatives, risks, and simpler designs — not blind copy-paste answers."),
    ],
    practice: [
      topic("Write a one-page product brief", "Describe users, problem, scope, and what 'done' means."),
      topic("Generate a feature plan", "List 5 tasks with acceptance criteria and test steps."),
      topic("Build one working feature", "Implement, test, and document what you changed."),
    ],
    projects: [
      topic("Mini app with AI assistance", "Create a small tool (notes, quiz, or tracker) using AI for scaffolding and review."),
      topic("Code review with AI", "Run your code through a structured review checklist and fix two issues."),
      topic("Demo and retrospective", "Record a 2-minute demo and list what you would improve next."),
    ],
    review: [
      topic("Key patterns recap", "Summarize when AI helps vs when you must think independently."),
      topic("Common mistakes", "List hallucinations, skipped tests, and over-scoped features to avoid."),
      topic("Final assessment topics", "Be ready to explain your project, tests, and one design decision in the physical exam."),
    ],
  },
  {
    title: "Prompting Fundamentals",
    category: "Artificial Intelligence",
    description: "Learn the essential structure of clear prompts that produce useful, repeatable results.",
    concepts: [
      topic("Role, context, task, constraints", "Every strong prompt states who the AI is, what it knows, what to do, and limits."),
      topic("Output format control", "Specify bullets, JSON, tables, or step lists when structure matters."),
      topic("Examples and rubrics", "Few-shot examples and scoring criteria improve consistency."),
    ],
    practice: [
      topic("Rewrite vague prompts", "Take three weak prompts and make them specific and testable."),
      topic("Add constraints", "Include length, tone, audience, and must-not-include rules."),
      topic("Compare outputs", "Run the same task with two prompt versions and score results."),
    ],
    projects: [
      topic("Study assistant prompt pack", "Create prompts for summarizing, quizzing, and explaining errors."),
      topic("Coding helper template", "Build a reusable prompt for small bug fixes with test steps."),
      topic("Prompt test log", "Document 10 runs with pass/fail and improvements."),
    ],
    review: [
      topic("Prompt anatomy checklist", "Memorize the fields every production prompt should include."),
      topic("Safety and verification", "Never paste secrets; always verify facts and code."),
      topic("Final assessment prep", "Be ready to write a prompt from scratch for a given scenario live."),
    ],
  },
  {
    title: "Practical Prompt Engineering",
    category: "Artificial Intelligence",
    description: "Design robust prompts for research, coding, analysis, content, and structured workflows.",
    concepts: [
      topic("Decomposition chains", "Break complex work into prompt sequences with handoffs."),
      topic("Reusable templates", "Parameterize prompts for repeat tasks across projects."),
      topic("Schemas and validation", "Ask for JSON or tables you can programmatically check."),
    ],
    practice: [
      topic("Multi-step research chain", "Outline → gather → synthesize → critique."),
      topic("Coding workflow prompt", "Spec, implement, test, refactor as separate steps."),
      topic("Consistency test", "Run one template five times and measure variance."),
    ],
    projects: [
      topic("Workflow for a course assignment", "Automate outline, draft, and self-review for one topic."),
      topic("Structured data extraction", "Pull fields from sample text into a validated JSON schema."),
      topic("Team prompt library", "Publish 5 templates with usage notes for classmates."),
    ],
    review: [
      topic("Chain design patterns", "When to split vs when to keep one prompt."),
      topic("Evaluation metrics", "Accuracy, completeness, format, safety."),
      topic("Final assessment prep", "Explain a chain you built and how you tested it."),
    ],
  },
  {
    title: "Testing and Improving AI Prompts",
    category: "Artificial Intelligence",
    description: "Measure whether a prompt works and improve it with test cases instead of guesswork.",
    concepts: [
      topic("Define success first", "Write acceptance criteria before iterating on wording."),
      topic("Test case types", "Normal, edge, adversarial, and empty-input cases."),
      topic("Iteration loop", "Measure → find worst failure → fix → re-test."),
    ],
    practice: [
      topic("Build a 10-case test set", "Cover happy path and failure modes."),
      topic("Score with a rubric", "Rate outputs 1–5 on accuracy, format, and safety."),
      topic("Fix the weakest case", "Target the lowest-scoring failure mode first."),
    ],
    projects: [
      topic("Prompt regression suite", "Keep tests in a doc and re-run after each edit."),
      topic("A/B two prompt versions", "Pick a winner with numeric scores."),
      topic("Report for stakeholders", "One-page summary of quality and remaining risks."),
    ],
    review: [
      topic("Testing vocabulary", "Regression, edge case, adversarial prompt."),
      topic("When to stop iterating", "Good enough vs diminishing returns."),
      topic("Final assessment prep", "Present your rubric and one improved failure case."),
    ],
  },
  {
    title: "AI Tools for Students and Builders",
    category: "Artificial Intelligence",
    description: "Choose and use AI assistants responsibly for study, coding, design, research, and productivity.",
    concepts: [
      topic("Match tools to tasks", "Chat, code, image, search, and automation tools have different strengths."),
      topic("Verify outputs", "Check citations, run code, and cross-source facts."),
      topic("Data hygiene", "No passwords, private data, or exam content in public tools."),
    ],
    practice: [
      topic("Tool comparison matrix", "Same task across three tools — note quality and speed."),
      topic("Verify an AI answer", "Fact-check one technical response with primary sources."),
      topic("Personal safe workflow", "Document do/don't rules for your accounts and projects."),
    ],
    projects: [
      topic("Study stack", "Combine AI with notes, flashcards, and spaced review."),
      topic("Builder stack", "IDE assistant + tests + version control workflow."),
      topic("Ethics statement", "When you use AI vs when you don't — for your team."),
    ],
    review: [
      topic("Responsible use", "Academic integrity and workplace policies."),
      topic("Tool limits", "Context windows, stale knowledge, and cost."),
      topic("Final assessment prep", "Defend your tool choices for two sample tasks."),
    ],
  },
  {
    title: "Web Development Foundations",
    category: "Web Development",
    description: "Build accessible, responsive web pages using HTML, CSS, JavaScript, and browser fundamentals.",
    concepts: [
      topic("Semantic HTML", "Use headings, landmarks, and forms for accessibility and SEO."),
      topic("Responsive CSS", "Flexbox, grid, and mobile-first layouts."),
      topic("JavaScript in the browser", "DOM events, fetch, and basic state."),
    ],
    practice: [
      topic("Responsive landing page", "Hero, features, and contact section."),
      topic("Form validation", "Client-side checks with clear error messages."),
      topic("Fetch API data", "Load JSON and render a simple list."),
    ],
    projects: [
      topic("Personal portfolio page", "About, projects, and contact with responsive layout."),
      topic("Accessible component", "Button, modal, or nav with keyboard support."),
      topic("Deploy to static hosting", "Publish and share a live URL."),
    ],
    review: [
      topic("HTML/CSS/JS recap", "Core tags, layout patterns, and fetch basics."),
      topic("Debugging in DevTools", "Elements, console, network tab."),
      topic("Final assessment prep", "Walk through your page structure and one script live."),
    ],
  },
  {
    title: "Modern React and Next.js",
    category: "Web Development",
    description: "Build a modern full-stack web interface with reusable components, routing, and server-backed data.",
    concepts: [
      topic("Components and props", "Small, reusable UI with clear data flow."),
      topic("Client vs server", "What runs in the browser vs on the server in Next.js."),
      topic("Loading and error UI", "Skeletons, empty states, and error boundaries."),
    ],
    practice: [
      topic("Component library", "Button, card, input with shared styles."),
      topic("Routed pages", "List and detail routes with navigation."),
      topic("Data fetching", "Load data from an API route or Supabase."),
    ],
    projects: [
      topic("Course catalog mini-app", "List, filter, and detail pages."),
      topic("Auth-aware dashboard shell", "Layout with protected route pattern."),
      topic("Performance pass", "Reduce bundle size and improve LCP on one page."),
    ],
    review: [
      topic("React mental model", "State, effects, and when to re-render."),
      topic("Next.js App Router", "Layouts, loading.tsx, and middleware basics."),
      topic("Final assessment prep", "Explain one component tree and one data flow."),
    ],
  },
  {
    title: "Android Development Basics",
    category: "Mobile Development",
    description: "Understand Android app structure and build a small application with Kotlin and modern UI principles.",
    concepts: [
      topic("Activities and navigation", "Screens, back stack, and intents."),
      topic("UI state", "State hoisting and predictable updates."),
      topic("Local storage", "Save user preferences and simple lists."),
    ],
    practice: [
      topic("Two-screen app", "List screen and detail screen."),
      topic("Validated form", "Input rules and error display."),
      topic("Persist a list", "Save and reload items locally."),
    ],
    projects: [
      topic("Student utility app", "Tasks, notes, or attendance tracker."),
      topic("Material-style UI", "Consistent theme, typography, and spacing."),
      topic("Play Store readiness checklist", "Icons, permissions, and privacy notes."),
    ],
    review: [
      topic("Kotlin basics for UI", "Data classes, null safety, and lambdas."),
      topic("Lifecycle awareness", "What happens on rotate and background."),
      topic("Final assessment prep", "Demo navigation and one saved-data feature."),
    ],
  },
  {
    title: "Programming and Problem Solving",
    category: "Computer Science",
    description: "Learn variables, control flow, functions, data structures, debugging, and systematic problem solving.",
    concepts: [
      topic("Problem decomposition", "Inputs, outputs, steps, and edge cases."),
      topic("Data structures", "Arrays, maps, sets, and when to use each."),
      topic("Debugging method", "Reproduce, isolate, fix, and add a test."),
    ],
    practice: [
      topic("Three algorithm drills", "Search, sort, and counting problems."),
      topic("Trace by hand", "Follow a loop and predict output."),
      topic("Fix with tests", "Repair a broken function using test cases."),
    ],
    projects: [
      topic("CLI quiz game", "Questions, scoring, and replay."),
      topic("File or API mini-tool", "Read input and produce a report."),
      topic("Complexity notes", "Big-O for your main loops."),
    ],
    review: [
      topic("Patterns recap", "Two pointers, hash map lookups, recursion intro."),
      topic("Readable code", "Naming, small functions, and comments when needed."),
      topic("Final assessment prep", "Solve one small problem on paper or whiteboard."),
    ],
  },
  {
    title: "Technical Thinking for Builders",
    category: "Computer Science",
    description: "Learn how engineers clarify requirements, compare solutions, manage complexity, and make defensible decisions.",
    concepts: [
      topic("Clarify the real problem", "Ask why, who, and what success looks like."),
      topic("Constraints and risks", "Time, cost, security, and maintainability."),
      topic("Simple evolvable design", "Start small; avoid premature abstraction."),
    ],
    practice: [
      topic("Assumption list", "Document unknowns for a sample project."),
      topic("Compare two designs", "Pros, cons, and recommendation."),
      topic("Decision record", "Context, decision, consequences."),
    ],
    projects: [
      topic("Architecture sketch", "Boxes and arrows for a student portal feature."),
      topic("Risk register", "Top five risks with mitigations."),
      topic("Stakeholder update", "One-page status for a non-technical reader."),
    ],
    review: [
      topic("Trade-off vocabulary", "Latency vs cost, build vs buy."),
      topic("Communication", "Clear updates and escalation."),
      topic("Final assessment prep", "Present one decision and defend it."),
    ],
  },
  {
    title: "Git and GitHub Essentials",
    category: "Developer Tools",
    description: "Use version control confidently for personal projects and team collaboration.",
    concepts: [
      topic("Commits and history", "Atomic commits and meaningful messages."),
      topic("Branches and merges", "Feature branches and conflict resolution."),
      topic("Pull requests", "Review, feedback, and CI basics."),
    ],
    practice: [
      topic("Clone and first commit", "README, .gitignore, and initial push."),
      topic("Feature branch workflow", "Branch, commit, merge or PR."),
      topic("Resolve a conflict", "Practice merge conflict on a toy repo."),
    ],
    projects: [
      topic("Team simulation", "Two branches, PR review, and squash merge."),
      topic("Release tags", "Tag v1.0 and write short release notes."),
      topic("Recover from mistake", "Revert a bad commit safely."),
    ],
    review: [
      topic("Git commands recap", "status, diff, log, stash, cherry-pick intro."),
      topic("GitHub collaboration", "Issues, labels, and project board."),
      topic("Final assessment prep", "Explain a PR you would open for a bugfix."),
    ],
  },
  {
    title: "Cloud Computing Fundamentals",
    category: "Cloud",
    description: "Understand cloud concepts, service models, regions, availability, scalability, security, and cost.",
    concepts: [
      topic("Service models", "IaaS, PaaS, SaaS with examples."),
      topic("Regions and AZs", "Latency, redundancy, and disaster recovery."),
      topic("Shared responsibility", "What the provider vs you secure."),
    ],
    practice: [
      topic("Map app to cloud", "Pick services for a simple web app."),
      topic("Reliability sketch", "Single point of failure analysis."),
      topic("Cost drivers", "Compute, storage, egress, and idle resources."),
    ],
    projects: [
      topic("Well-Architected lite review", "Score one app on reliability and cost."),
      topic("Multi-AZ diagram", "Draw failover for a database."),
      topic("Cost estimate", "Monthly bill for 1000 users — assumptions listed."),
    ],
    review: [
      topic("Cloud vocabulary", "Elasticity, scaling, CDN, managed service."),
      topic("When not to cloud", "Local dev, edge cases, compliance."),
      topic("Final assessment prep", "Explain shared responsibility for one workload."),
    ],
  },
  {
    title: "AWS Cloud Essentials",
    category: "AWS",
    description: "Learn the core AWS global infrastructure and the services every beginner should recognize.",
    concepts: [
      topic("Global infrastructure", "Regions, AZs, edge locations."),
      topic("Core services map", "IAM, EC2, S3, VPC, RDS, Lambda at a glance."),
      topic("Security basics", "Root account, MFA, least privilege."),
    ],
    practice: [
      topic("IAM checklist", "Users, groups, roles, policies."),
      topic("S3 bucket policy sketch", "Public vs private objects."),
      topic("Architecture diagram", "Static site + API + database on AWS."),
    ],
    projects: [
      topic("Service picker", "Choose AWS services for three workloads."),
      topic("Billing alarm plan", "Budgets and alerts for a student account."),
      topic("Console tour doc", "Screenshot key screens with notes."),
    ],
    review: [
      topic("Service cheat sheet", "When to use EC2 vs Lambda vs Fargate intro."),
      topic("Free tier awareness", "Avoid surprise charges."),
      topic("Final assessment prep", "Label services on a blank architecture diagram."),
    ],
  },
  {
    title: "Cybersecurity Basics for Builders",
    category: "Security",
    description: "Protect accounts, applications, data, and users with practical security fundamentals.",
    concepts: [
      topic("Authentication", "Passwords, MFA, OAuth basics."),
      topic("OWASP top risks", "Injection, XSS, broken access control intro."),
      topic("Secrets management", "Env vars, vaults, never commit keys."),
    ],
    practice: [
      topic("Threat model", "Student portal: assets, threats, mitigations."),
      topic("Secret scan", "Find fake keys in a sample repo."),
      topic("Input validation rules", "Email, file upload, and length limits."),
    ],
    projects: [
      topic("Secure login checklist", "HTTPS, cookies, rate limits."),
      topic("Dependency audit", "Run npm audit and fix one issue."),
      topic("Incident response outline", "What to do if a key leaks."),
    ],
    review: [
      topic("Security habits", "Updates, least privilege, logging."),
      topic("Privacy basics", "PII and consent."),
      topic("Final assessment prep", "Present your threat model for one feature."),
    ],
  },
  {
    title: "Workplace Ethics and Corporate Readiness",
    category: "Professional Skills",
    description: "Develop professional communication, ownership, teamwork, ethics, and responsible workplace behavior.",
    concepts: [
      topic("Professional communication", "Clear emails, updates, and meetings."),
      topic("Ownership", "Deliver, escalate early, document decisions."),
      topic("Ethics and confidentiality", "Conflicts of interest and data handling."),
    ],
    practice: [
      topic("Status update", "Write a one-paragraph project update."),
      topic("Ethical scenario", "Respond to a pressure-to-ship unsafe feature."),
      topic("First-week checklist", "Tools, access, mentors, and goals."),
    ],
    projects: [
      topic("Team charter", "Roles, norms, and conflict resolution."),
      topic("Client email draft", "Professional tone for a delay notification."),
      topic("Personal growth plan", "90-day skills and feedback goals."),
    ],
    review: [
      topic("Workplace scenarios", "Deadlines, feedback, and accountability."),
      topic("AWS SBG values", "Collaboration, learning, and integrity."),
      topic("Final assessment prep", "Role-play a status meeting or ethical choice."),
    ],
  },
];

const intermediateCourses = [
  {
    title: "Python for Automation and AI Scripts",
    category: "Development",
    description: "Use Python for scripting, data tasks, APIs, and small AI-powered utilities students can use in real projects.",
    concepts: [
      topic("Python environment", "venv, pip, and project structure."),
      topic("Functions and modules", "Reuse, typing, and docstrings."),
      topic("Working with APIs", "requests, JSON, and error handling."),
    ],
    practice: [
      topic("File automation script", "Rename, organize, or summarize files in a folder."),
      topic("CSV / JSON processor", "Clean and aggregate sample data."),
      topic("Call an AI API", "Send a prompt and parse structured output."),
    ],
    projects: [
      topic("Student productivity bot", "CLI that quizzes or summarizes notes."),
      topic("Webhook listener", "Simple Flask/FastAPI endpoint with validation."),
      topic("Package and document", "README, requirements.txt, and usage examples."),
    ],
    review: [
      topic("Python patterns", "List comps, dicts, context managers."),
      topic("Testing with pytest intro", "One function, three tests."),
      topic("Final assessment prep", "Explain your script's I/O and error paths."),
    ],
  },
  {
    title: "React Native Mobile Development",
    category: "Mobile Development",
    description: "Build cross-platform mobile apps with React Native — navigation, state, APIs, and device-ready UI.",
    concepts: [
      topic("RN architecture", "JS thread, native modules, Expo vs bare."),
      topic("Navigation", "Stack and tab navigators."),
      topic("State and data", "useState, context, and fetching remote data."),
    ],
    practice: [
      topic("Screen flow", "Auth stack and main tabs."),
      topic("Styled components", "Consistent theme and safe areas."),
      topic("API integration", "Load list data with loading states."),
    ],
    projects: [
      topic("Campus events app", "List, detail, and register interest."),
      topic("Offline-friendly list", "Cache last fetch with AsyncStorage."),
      topic("OTA update awareness", "Expo publish or EAS intro."),
    ],
    review: [
      topic("Performance basics", "FlatList, memo, image sizing."),
      topic("Debugging", "Flipper, logs, and common RN errors."),
      topic("Final assessment prep", "Demo navigation and one API screen."),
    ],
  },
  {
    title: "Flutter Cross-Platform Development",
    category: "Mobile Development",
    description: "Create beautiful mobile apps with Flutter and Dart — widgets, state management, and platform integration.",
    concepts: [
      topic("Widget tree", "Stateless vs stateful widgets."),
      topic("Layout", "Row, Column, Stack, and responsive constraints."),
      topic("Dart essentials", "Null safety, async/await, futures."),
    ],
    practice: [
      topic("Material app shell", "AppBar, drawer, and routes."),
      topic("Forms and validation", "TextField, controllers, and errors."),
      topic("HTTP with dio/http", "Parse JSON into model classes."),
    ],
    projects: [
      topic("AWS SBG companion app", "Courses list and progress UI (mock data)."),
      topic("Theme switcher", "Light/dark with persisted preference."),
      topic("Platform channel intro", "When you need native code."),
    ],
    review: [
      topic("State options", "setState, Provider/Riverpod overview."),
      topic("Build and release", "APK vs AAB, signing basics."),
      topic("Final assessment prep", "Explain widget rebuild and one async flow."),
    ],
  },
  {
    title: "AI-Powered Application Features",
    category: "Artificial Intelligence",
    description: "Add practical AI features — chat, summarization, classification, and RAG-lite — to real student applications.",
    concepts: [
      topic("Feature design", "When AI adds value vs gimmick."),
      topic("Prompt + API pattern", "System prompt, user message, guardrails."),
      topic("Latency and cost", "Caching, streaming, and token limits."),
    ],
    practice: [
      topic("Summarization endpoint", "Long text → bullet summary with limits."),
      topic("Classification", "Tag support tickets or course feedback."),
      topic("Safety filters", "Block PII and unsafe requests."),
    ],
    projects: [
      topic("Study buddy chat", "Context-aware Q&A on uploaded notes."),
      topic("RAG-lite search", "Chunk notes and retrieve top passages."),
      topic("Evaluation set", "10 questions with expected quality bar."),
    ],
    review: [
      topic("Monitoring", "Log prompts, errors, and fallback UX."),
      topic("Fallbacks", "When the model fails, what does the user see?"),
      topic("Final assessment prep", "Demo one AI feature and its guardrails."),
    ],
  },
  {
    title: "AWS EC2, S3, and IAM in Practice",
    category: "AWS",
    description: "Hands-on with compute, storage, and identity — launch instances, host assets, and apply least privilege.",
    concepts: [
      topic("EC2 fundamentals", "AMI, instance types, security groups."),
      topic("S3 deep dive", "Buckets, policies, versioning, lifecycle."),
      topic("IAM patterns", "Users, roles, policies, and trust."),
    ],
    practice: [
      topic("Launch and SSH to EC2", "Key pair, SG rules, and basic hardening."),
      topic("Static site on S3", "Bucket policy and optional CloudFront intro."),
      topic("Role for EC2", "Instance profile accessing S3 without keys."),
    ],
    projects: [
      topic("Three-tier sketch", "ALB, EC2, RDS diagram and security groups."),
      topic("Backup strategy", "Snapshots and S3 versioning."),
      topic("Cost review", "Stop idle instances; S3 storage classes."),
    ],
    review: [
      topic("Troubleshooting", "SG, NACL, IAM deny debugging."),
      topic("Well-Architected security pillar", "Identity, detection, protection."),
      topic("Final assessment prep", "Draw IAM role flow for app → S3."),
    ],
  },
  {
    title: "AWS Lambda and Serverless APIs",
    category: "AWS",
    description: "Build event-driven backends with Lambda, API Gateway, and managed integrations — no server babysitting.",
    concepts: [
      topic("Lambda execution model", "Cold start, memory, timeout, concurrency."),
      topic("API Gateway", "REST routes, stages, and auth."),
      topic("Triggers", "S3, EventBridge, and scheduled jobs."),
    ],
    practice: [
      topic("Hello Lambda", "Deploy and test via console and CLI."),
      topic("CRUD API", "API Gateway + Lambda + DynamoDB intro."),
      topic("Environment variables", "Secrets via SSM Parameter Store intro."),
    ],
    projects: [
      topic("Webhook processor", "Validate signature and write to table."),
      topic("Scheduled report", "Cron Lambda summarizing data."),
      topic("IaC awareness", "SAM or CDK overview slide deck."),
    ],
    review: [
      topic("Observability", "CloudWatch logs, metrics, alarms."),
      topic("Limits and quotas", "Payload size, duration, VPC cold starts."),
      topic("Final assessment prep", "Trace one HTTP request through API GW → Lambda."),
    ],
  },
  {
    title: "VPC Networking for Cloud Builders",
    category: "Cloud",
    description: "Design subnets, routing, security groups, and connectivity for secure cloud applications.",
    concepts: [
      topic("VPC components", "Subnets, IGW, NAT, route tables."),
      topic("Public vs private", "Where to place apps and databases."),
      topic("Security groups vs NACLs", "Stateful vs stateless rules."),
    ],
    practice: [
      topic("Two-tier VPC diagram", "Public web, private DB subnets."),
      topic("NAT gateway pattern", "Private subnet outbound access."),
      topic("Peering and endpoints intro", "VPC endpoints for S3/DynamoDB."),
    ],
    projects: [
      topic("Harden a sample VPC", "Remove 0.0.0.0/0 on sensitive ports."),
      topic("Connectivity checklist", "Document flows for admin and users."),
      topic("Troubleshooting lab", "Fix broken route table scenario on paper."),
    ],
    review: [
      topic("HA networking", "Multi-AZ subnets."),
      topic("Hybrid intro", "VPN and Direct Connect at high level."),
      topic("Final assessment prep", "Explain packet flow from user to private DB."),
    ],
  },
  {
    title: "Docker and Containers for Cloud",
    category: "Cloud",
    description: "Package apps with Docker and understand how containers run on ECS, Fargate, and Kubernetes intro.",
    concepts: [
      topic("Images and containers", "Layers, Dockerfile, and registries."),
      topic("Compose", "Multi-service local dev."),
      topic("ECS/Fargate map", "Task, service, cluster mental model."),
    ],
    practice: [
      topic("Dockerize a web app", "Build, run, and publish to ECR intro."),
      topic("Environment and volumes", "Config via env; persist data correctly."),
      topic("Health checks", "READY probes and restart policy."),
    ],
    projects: [
      topic("CI build pipeline sketch", "Test → build image → push."),
      topic("Two-service compose", "App + Redis or Postgres locally."),
      topic("Security scan", "Avoid root user; slim base images."),
    ],
    review: [
      topic("Orchestration why", "When compose vs ECS vs EKS."),
      topic("12-factor containers", "Config, logs, disposability."),
      topic("Final assessment prep", "Explain your Dockerfile line by line."),
    ],
  },
  {
    title: "SQL and Data Skills for Builders",
    category: "Development",
    description: "Query, model, and reason about relational data — essential for apps, analytics, and cloud databases.",
    concepts: [
      topic("Relational model", "Tables, keys, normalization intro."),
      topic("SQL queries", "SELECT, JOIN, GROUP BY, indexes."),
      topic("Postgres on RDS intro", "Connections, backups, and migrations."),
    ],
    practice: [
      topic("Schema design", "Users, courses, enrollments ERD."),
      topic("Write analytical queries", "Counts, filters, and aggregates."),
      topic("Migration script", "Add column safely with rollback plan."),
    ],
    projects: [
      topic("Reporting queries", "Top courses, active students, monthly signups."),
      topic("Index tuning exercise", "EXPLAIN before/after on slow query."),
      topic("Data quality checks", "Find orphans and duplicates."),
    ],
    review: [
      topic("Transactions", "ACID and isolation intro."),
      topic("NoSQL when", "When Postgres is not enough."),
      topic("Final assessment prep", "Write JOIN query for enrollment report."),
    ],
  },
  {
    title: "Cloud Cost and Reliability Basics",
    category: "Cloud",
    description: "Optimize spend and design reliable workloads using AWS Well-Architected principles at intermediate depth.",
    concepts: [
      topic("Cost pillars", "Compute, storage, data transfer, support."),
      topic("Reliability patterns", "Multi-AZ, backups, health checks."),
      topic("Rightsizing", "Metrics-driven instance and service choices."),
    ],
    practice: [
      topic("Cost explorer walkthrough", "Find top services and trends."),
      topic("Budgets and alerts", "Set thresholds for student accounts."),
      topic("SLA and SLO sketch", "Define uptime target for a portal."),
    ],
    projects: [
      topic("Optimize a bill", "Recommend 5 changes with estimated savings."),
      topic("Runbook", "Steps when the app is down."),
      topic("Chaos lite", "Game-day scenario on paper."),
    ],
    review: [
      topic("Well-Architected lenses", "Ops, security, reliability, performance, cost."),
      topic("Sustainability intro", "Graviton and efficient architectures."),
      topic("Final assessment prep", "Present cost + reliability trade-off case."),
    ],
  },
];

const advancedCourses = [
  {
    title: "Machine Learning Foundations with Python",
    category: "AI / ML",
    description: "Supervised learning, evaluation, and scikit-learn workflows for students moving from AI users to ML practitioners.",
    concepts: [
      topic("ML workflow", "Data → features → train → evaluate → deploy intro."),
      topic("Supervised learning", "Regression vs classification."),
      topic("Metrics", "Accuracy, precision, recall, RMSE."),
    ],
    practice: [
      topic("Train/test split", "Avoid leakage; stratified sampling."),
      topic("Baseline model", "Linear model or decision tree on tabular data."),
      topic("Cross-validation", "K-fold and why it matters."),
    ],
    projects: [
      topic("Course completion predictor", "Features from activity logs (sample CSV)."),
      topic("Error analysis", "Inspect worst predictions."),
      topic("Model card", "Document data, metrics, and limitations."),
    ],
    review: [
      topic("Bias and fairness intro", "Representative data and harm."),
      topic("Feature engineering", "Encoding, scaling, missing values."),
      topic("Final assessment prep", "Explain your metric choice and one failure mode."),
    ],
  },
  {
    title: "Deep Learning and Neural Networks Intro",
    category: "AI / ML",
    description: "Neural network concepts, training loops, and practical intro to frameworks for vision and NLP tasks.",
    concepts: [
      topic("Neurons and layers", "Forward pass and activation functions."),
      topic("Loss and optimization", "SGD, learning rate, overfitting."),
      topic("CNN vs RNN vs transformers intro", "When each architecture fits."),
    ],
    practice: [
      topic("Train on MNIST-class dataset", "Notebook with train/val curves."),
      topic("Regularization", "Dropout, early stopping, augmentation."),
      topic("Transfer learning", "Fine-tune a small pretrained model."),
    ],
    projects: [
      topic("Image classifier", "Campus object or document type classifier."),
      topic("Text classifier", "Sentiment or topic on short reviews."),
      topic("Deployment sketch", "Batch vs real-time inference on AWS."),
    ],
    review: [
      topic("GPU and cost", "When to train locally vs cloud."),
      topic("Responsible AI", "Deepfakes, misuse, and disclosure."),
      topic("Final assessment prep", "Draw network diagram and explain loss."),
    ],
  },
  {
    title: "AWS Cloud Practitioner Exam Preparation",
    category: "AWS Certification",
    description: "Structured prep for CLF-C02 — billing, global infrastructure, core services, security, and exam strategy.",
    concepts: [
      topic("Exam blueprint", "Domains, question styles, and timing."),
      topic("Billing and support", "Plans, calculators, organizations intro."),
      topic("Core services deep recap", "Compute, storage, DB, networking, security."),
    ],
    practice: [
      topic("Domain drill 1", "Cloud concepts and economics — 20 practice Qs."),
      topic("Domain drill 2", "Security and compliance scenarios."),
      topic("Domain drill 3", "Technology and services matching."),
    ],
    projects: [
      topic("Personal study plan", "4-week schedule with weak-area tracking."),
      topic("Flashcard deck", "50 high-yield facts with mnemonics."),
      topic("Mock exam review", "Analyze wrong answers by domain."),
    ],
    review: [
      topic("Exam day checklist", "ID, timing, flag-and-review strategy."),
      topic("Common traps", "S3 storage classes, IAM roles vs users."),
      topic("Final assessment prep", "Physical exam mirrors service + billing scenarios."),
    ],
  },
  {
    title: "AWS Solutions Architect Associate Path",
    category: "AWS Certification",
    description: "Design resilient, high-performing, secure, and cost-optimized architectures — SAA-C03 oriented study path.",
    concepts: [
      topic("Design principles", "Loose coupling, elasticity, automation."),
      topic("HA and DR", "Multi-AZ, multi-region, RTO/RPO."),
      topic("Storage and database selection", "When RDS vs DynamoDB vs Aurora."),
    ],
    practice: [
      topic("Scenario: web app scale", "ALB, ASG, RDS Multi-AZ."),
      topic("Scenario: static + dynamic", "CloudFront, S3, API, cache."),
      topic("Scenario: hybrid access", "VPN, Direct Connect, SSO intro."),
    ],
    projects: [
      topic("Architecture portfolio", "Three diagrams with trade-off notes."),
      topic("Cost estimate", "Monthly AWS bill for each design."),
      topic("Security review", "IAM, encryption, logging per design."),
    ],
    review: [
      topic("SAA exam domains map", "Design, security, migration, cost."),
      topic("Elimination strategy", "Rule out wrong answers fast."),
      topic("Final assessment prep", "Whiteboard architecture under time pressure."),
    ],
  },
  {
    title: "Production Deployment on AWS",
    category: "AWS",
    description: "CI/CD, infrastructure as code intro, monitoring, and safe releases for student-built applications.",
    concepts: [
      topic("CI/CD pipeline", "Build, test, deploy stages."),
      topic("IaC intro", "CloudFormation or Terraform concepts."),
      topic("Observability", "Logs, metrics, traces, alarms."),
    ],
    practice: [
      topic("Pipeline sketch", "GitHub Actions → build → deploy to S3/ECS."),
      topic("Blue/green or rolling intro", "Reduce downtime releases."),
      topic("Secrets in pipeline", "OIDC to AWS, no long-lived keys."),
    ],
    projects: [
      topic("Deploy a Next.js or API app", "Document env vars and rollback."),
      topic("Runbook", "Deploy, rollback, and incident steps."),
      topic("Load test lite", "k6 or Artillery intro on one endpoint."),
    ],
    review: [
      topic("Production checklist", "HTTPS, backups, monitoring, access."),
      topic("Incident response", "Pager, comms, postmortem."),
      topic("Final assessment prep", "Explain your pipeline and rollback plan."),
    ],
  },
  {
    title: "Advanced React Native Architecture",
    category: "Mobile Development",
    description: "Performance, navigation patterns, native modules, testing, and store release for production mobile apps.",
    concepts: [
      topic("Architecture layers", "UI, domain, data separation."),
      topic("Performance", "Hermes, profiling, list virtualization."),
      topic("Testing pyramid", "Unit, component, E2E with Detox intro."),
    ],
    practice: [
      topic("Refactor to feature folders", "Screens, hooks, services."),
      topic("Offline sync pattern", "Queue writes and reconcile."),
      topic("Deep linking", "Universal links and notification routes."),
    ],
    projects: [
      topic("Production-ready module", "Auth, error boundary, analytics hook."),
      topic("E2E smoke test", "Login → main flow automated."),
      topic("Store submission checklist", "Screenshots, privacy policy, review notes."),
    ],
    review: [
      topic("Native module when", "Camera, biometrics, background tasks."),
      topic("Crash reporting", "Sentry or Firebase Crashlytics intro."),
      topic("Final assessment prep", "Defend architecture diagram and perf choices."),
    ],
  },
  {
    title: "MLOps on AWS with SageMaker Intro",
    category: "AI / ML",
    description: "Train, track, and deploy models using SageMaker, feature stores intro, and batch vs real-time inference.",
    concepts: [
      topic("SageMaker building blocks", "Notebook, training job, endpoint."),
      topic("Experiment tracking", "Metrics, artifacts, and reproducibility."),
      topic("Model registry", "Versions, approval, and deployment."),
    ],
    practice: [
      topic("Train in SageMaker", "Built-in algorithm or custom script."),
      topic("Batch transform", "Score a dataset offline."),
      topic("Monitor endpoint", "Invocations, latency, data drift intro."),
    ],
    projects: [
      topic("End-to-end ML pipeline sketch", "S3 → process → train → deploy."),
      topic("Cost-aware training", "Spot instances and right-sizing."),
      topic("Governance", "Who can promote a model to production?"),
    ],
    review: [
      topic("MLOps vs DevOps", "Data, model, and code changes."),
      topic("Responsible deployment", "Human review for high-risk predictions."),
      topic("Final assessment prep", "Explain train vs inference architecture."),
    ],
  },
  {
    title: "Capstone: Full-Stack Cloud Application",
    category: "AWS",
    description: "Integrate frontend, API, database, auth, AI feature, and AWS services in one capstone aligned with SBG portal patterns.",
    concepts: [
      topic("Requirements to architecture", "Scope, NFRs, and milestones."),
      topic("Security end-to-end", "Auth, RLS, secrets, HTTPS."),
      topic("AI feature integration", "One useful model-backed capability."),
    ],
    practice: [
      topic("Milestone 1 — core CRUD", "Users and main entity with tests."),
      topic("Milestone 2 — cloud deploy", "Staging on AWS with monitoring."),
      topic("Milestone 3 — polish", "Performance, accessibility, docs."),
    ],
    projects: [
      topic("Capstone build", "Team or solo project with weekly demos."),
      topic("Architecture decision log", "At least five ADRs."),
      topic("Demo day prep", "5-minute pitch and Q&A."),
    ],
    review: [
      topic("Code review checklist", "Security, tests, readability."),
      topic("Operations", "Backups, alerts, on-call lite for students."),
      topic("Final assessment prep", "Physical exam demos full system + oral defense."),
    ],
  },
];

function courseRow(course, level) {
  const slug = slugify(course.title);
  const syllabus = makeSyllabus(course, slug);
  const durationByLevel = { Beginner: 4, Intermediate: 6, Advanced: 8 };
  const icon =
    course.category.includes("AWS") || course.category.includes("Cloud")
      ? "Cloud"
      : course.category.includes("AI") || course.category.includes("ML")
        ? "Sparkles"
        : course.category.includes("Mobile")
          ? "Smartphone"
          : "BookOpen";

  return {
    title: course.title,
    description: course.description,
    level,
    modules: syllabus.length,
    icon,
    status: "Active",
    category: course.category,
    instructor: "AWS SBG Learning Team",
    duration_hours: durationByLevel[level],
    certificate_enabled: true,
    syllabus,
  };
}

const allDefinitions = [
  ...beginnerCourses.map((c) => ({ course: c, level: "Beginner" })),
  ...intermediateCourses.map((c) => ({ course: c, level: "Intermediate" })),
  ...advancedCourses.map((c) => ({ course: c, level: "Advanced" })),
];

const { data: existing, error: readError } = await supabase.from("courses").select("id, title");
if (readError) throw readError;

const existingByTitle = new Map((existing ?? []).map((row) => [row.title.toLowerCase(), row.id]));

let inserted = 0;
let upgraded = 0;

for (const { course, level } of allDefinitions) {
  const row = courseRow(course, level);
  const key = course.title.toLowerCase();
  const existingId = existingByTitle.get(key);

  if (existingId) {
    const { error: updateError } = await supabase
      .from("courses")
      .update({
        description: row.description,
        level: row.level,
        modules: row.modules,
        category: row.category,
        duration_hours: row.duration_hours,
        syllabus: row.syllabus,
        certificate_enabled: true,
        status: "Active",
      })
      .eq("id", existingId);
    if (updateError) throw updateError;
    upgraded += 1;
    continue;
  }

  const { error: insertError } = await supabase.from("courses").insert(row);
  if (insertError) throw insertError;
  inserted += 1;
}

console.log(`Course catalog sync complete: ${inserted} inserted, ${upgraded} upgraded (${allDefinitions.length} total definitions).`);
