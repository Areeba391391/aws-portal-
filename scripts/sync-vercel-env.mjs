import fs from "node:fs";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function vercel(args) {
  spawnSync("vercel.cmd", [...args, "--scope", "zakwan05s-projects"], {
    cwd: process.cwd(),
    timeout: 15_000,
    windowsHide: true,
    stdio: "ignore",
  });
}

for (const name of names) {
  for (const target of ["production", "development"]) {
    vercel(["env", "rm", name, target, "--yes"]);
    vercel(["env", "add", name, target, "--value", env[name], "--yes"]);
    console.log(`Synced ${name} (${target})`);
  }
}
