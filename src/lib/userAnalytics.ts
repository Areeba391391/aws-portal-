export interface UserSignupRecord {
  createdAt?: string;
  role?: string;
  status?: string;
}

export interface MonthlyUserGrowth {
  month: string;
  users: number;
  newUsers: number;
}

export interface UserGrowthSummary {
  totalUsers: number;
  activeUsers: number;
  newThisMonth: number;
  newLastMonth: number;
  growthPercent: number | null;
  students: number;
  team: number;
  admins: number;
  series: MonthlyUserGrowth[];
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function buildUserGrowthAnalytics(users: UserSignupRecord[], months = 6): UserGrowthSummary {
  const now = new Date();
  const monthBuckets: Date[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    monthBuckets.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  const signupsByMonth = new Map<string, number>();
  for (const user of users) {
    if (!user.createdAt) continue;
    const created = new Date(user.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = monthKey(created);
    signupsByMonth.set(key, (signupsByMonth.get(key) ?? 0) + 1);
  }

  const windowStart = monthBuckets[0];
  let cumulative = users.filter((user) => {
    if (!user.createdAt) return false;
    const created = new Date(user.createdAt);
    return !Number.isNaN(created.getTime()) && created < windowStart;
  }).length;

  const series = monthBuckets.map((bucket) => {
    const key = monthKey(bucket);
    const newUsers = signupsByMonth.get(key) ?? 0;
    cumulative += newUsers;
    return {
      month: monthLabel(bucket),
      users: cumulative,
      newUsers,
    };
  });

  const thisMonthKey = monthKey(now);
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const newThisMonth = signupsByMonth.get(thisMonthKey) ?? 0;
  const newLastMonth = signupsByMonth.get(lastMonthKey) ?? 0;

  let growthPercent: number | null = null;
  if (newLastMonth > 0) {
    growthPercent = Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100);
  } else if (newThisMonth > 0) {
    growthPercent = 100;
  }

  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status === "Active").length,
    newThisMonth,
    newLastMonth,
    growthPercent,
    students: users.filter((user) => user.role === "student").length,
    team: users.filter((user) => user.role === "team").length,
    admins: users.filter((user) => user.role === "admin").length,
    series,
  };
}

export function formatGrowthPercent(value: number | null) {
  if (value === null) return "—";
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}
