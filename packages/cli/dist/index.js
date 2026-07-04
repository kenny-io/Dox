#!/usr/bin/env node

// src/router.ts
var COMMANDS = [
  { name: "init", summary: "Scaffold a new Dox project (alias for create-dox)", usage: "dox init [dir] [--yes]" },
  { name: "dev", summary: "Run the docs site locally (agent endpoints live)", usage: "dox dev [-- <framework args>]" },
  { name: "build", summary: "Build the production site", usage: "dox build" },
  { name: "start", summary: "Serve the built production site", usage: "dox start" },
  { name: "deploy", summary: "Build and deploy to a live URL", usage: "dox deploy [--prod] [--cloudflare]" },
  { name: "check", summary: "Lint content + Agent Readiness Score", usage: "dox check [--agents] [--fix] [--ci]" },
  { name: "new", summary: "Create a new page and register it in docs.json", usage: 'dox new <page-id> [--title "..."]' },
  { name: "migrate", summary: "Migrate docs from a GitHub URL", usage: "dox migrate <github-url> [dir]" },
  { name: "translate", summary: "Translate content into a locale", usage: "dox translate --locale <code>" },
  { name: "mcp", summary: "Start the Model Context Protocol server (stdio)", usage: "dox mcp" }
];
function parseArgs(argv) {
  const command = argv[0] && !argv[0].startsWith("-") ? argv[0] : void 0;
  const rest = command ? argv.slice(1) : argv.slice();
  const positionals = [];
  const flags = /* @__PURE__ */ new Set();
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith("-")) {
      flags.add(token);
      if (i + 1 < rest.length && !rest[i + 1].startsWith("-")) {
        i += 1;
      }
    } else {
      positionals.push(token);
    }
  }
  return {
    command,
    positionals,
    rest,
    flags,
    getFlag(name) {
      const idx = rest.indexOf(name);
      if (idx !== -1 && idx + 1 < rest.length && !rest[idx + 1].startsWith("-")) return rest[idx + 1];
      return void 0;
    },
    hasFlag(...names) {
      return names.some((name) => flags.has(name));
    }
  };
}
function helpText() {
  const lines = [];
  lines.push("");
  lines.push("  dox \u2014 the unified documentation CLI");
  lines.push("");
  lines.push("  You author content/, docs.json, and snippets/.");
  lines.push("  The framework (Next.js) is a hidden runtime \u2014 you never touch src/app/.");
  lines.push("");
  lines.push("  Usage: dox <command> [options]");
  lines.push("");
  lines.push("  Commands:");
  const pad = Math.max(...COMMANDS.map((c) => c.name.length));
  for (const command of COMMANDS) {
    lines.push(`    ${command.name.padEnd(pad)}  ${command.summary}`);
  }
  lines.push("");
  lines.push('  Run "dox <command> --help" for command-specific usage.');
  lines.push("");
  return lines.join("\n");
}

// src/process.ts
import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { createRequire } from "module";
import path from "path";
var require2 = createRequire(import.meta.url);
function run(command, args, cwd = process.cwd()) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", () => resolve(127));
  });
}
function resolveBin(pkg, binName) {
  try {
    const pkgJsonPath = require2.resolve(`${pkg}/package.json`);
    const pkgDir = path.dirname(pkgJsonPath);
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const binRel = typeof pkgJson.bin === "string" ? pkgJson.bin : pkgJson.bin?.[binName];
    if (!binRel) return null;
    return path.join(pkgDir, binRel);
  } catch {
    return null;
  }
}
function isDoxProject(cwd = process.cwd()) {
  return existsSync(path.join(cwd, "docs.json"));
}
function projectScripts(cwd = process.cwd()) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8"));
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}
function runFramework(task, scriptName, passthrough = []) {
  const scripts = projectScripts();
  if (scripts[scriptName]) {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    return run(npm, ["run", scriptName, ...passthrough.length ? ["--", ...passthrough] : []]);
  }
  const npx2 = process.platform === "win32" ? "npx.cmd" : "npx";
  return run(npx2, ["next", task, ...passthrough]);
}
function runPackageBin(pkg, binName, args) {
  const bin = resolveBin(pkg, binName);
  if (!bin) {
    process.stderr.write(`
  Could not resolve the "${binName}" binary from "${pkg}".
  Is it installed in this project?

`);
    return Promise.resolve(127);
  }
  return run(process.execPath, [bin, ...args]);
}

// src/commands/new-page.ts
import { existsSync as existsSync2, mkdirSync, readFileSync as readFileSync2, writeFileSync } from "fs";
import path2 from "path";
function deriveTitle(pageId) {
  const last = pageId.split("/").pop() ?? pageId;
  return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function runNewPage(args, cwd = process.cwd()) {
  const pageId = args.positionals[0];
  if (!pageId) {
    process.stderr.write('\n  Usage: dox new <page-id> [--title "..."] [--description "..."]\n\n');
    return 1;
  }
  const docsJsonPath = path2.join(cwd, "docs.json");
  if (!existsSync2(docsJsonPath)) {
    process.stderr.write("\n  Not a Dox project: docs.json not found.\n\n");
    return 1;
  }
  const normalized = pageId.replace(/\.mdx$/, "").replace(/^\/+/, "");
  const filePath = path2.join(cwd, "src", "content", `${normalized}.mdx`);
  if (existsSync2(filePath)) {
    process.stderr.write(`
  Page already exists: src/content/${normalized}.mdx

`);
    return 1;
  }
  const title = args.getFlag("--title") ?? deriveTitle(normalized);
  const description = args.getFlag("--description") ?? "";
  mkdirSync(path2.dirname(filePath), { recursive: true });
  const frontmatter = [
    "---",
    `title: ${title}`,
    `description: ${description}`,
    "---",
    "",
    `# ${title}`,
    "",
    "Write your content here.",
    ""
  ].join("\n");
  writeFileSync(filePath, frontmatter, "utf8");
  let registered = false;
  try {
    const docs = JSON.parse(readFileSync2(docsJsonPath, "utf8"));
    const tab = docs.tabs?.find((t) => !t.href && !t.api && t.groups && t.groups.length > 0);
    const group = tab?.groups?.[tab.groups.length - 1];
    if (group) {
      group.pages = group.pages ?? [];
      if (!group.pages.includes(normalized)) group.pages.push(normalized);
      writeFileSync(docsJsonPath, `${JSON.stringify(docs, null, 2)}
`, "utf8");
      registered = true;
    }
  } catch {
  }
  process.stdout.write(`
  Created src/content/${normalized}.mdx
`);
  process.stdout.write(
    registered ? "  Registered in docs.json navigation.\n\n" : "  Note: add it to docs.json navigation manually.\n\n"
  );
  return 0;
}

// src/commands/check.ts
async function runCheck(args) {
  const contentArgs = ["check", "."];
  if (args.hasFlag("--fix")) contentArgs.push("--fix");
  if (args.hasFlag("--ci")) contentArgs.push("--ci");
  if (args.hasFlag("--external")) contentArgs.push("--external");
  let exit = await runPackageBin("create-dox", "create-dox", contentArgs);
  if (args.hasFlag("--agents")) {
    const scripts = projectScripts();
    if (scripts["check:agents"]) {
      const npm = process.platform === "win32" ? "npm.cmd" : "npm";
      const min = args.getFlag("--min");
      const agentsExit = await run(npm, ["run", "check:agents", ...min ? ["--", "--min", min] : []]);
      if (agentsExit !== 0) exit = agentsExit;
    } else {
      process.stdout.write('\n  Agent Readiness check unavailable (no "check:agents" script in this project).\n\n');
    }
  }
  return exit;
}

// src/commands/deploy.ts
var SITE_URL_HINT = process.env.DOX_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
var npx = process.platform === "win32" ? "npx.cmd" : "npx";
var ADAPTERS = {
  vercel: {
    id: "vercel",
    label: "Vercel",
    deploy: (prod) => run(npx, ["vercel", "deploy", ...prod ? ["--prod"] : []])
  },
  cloudflare: {
    id: "cloudflare",
    label: "Cloudflare Pages",
    deploy: () => run(npx, ["wrangler", "pages", "deploy"])
  }
};
function selectAdapter(args) {
  if (args.hasFlag("--cloudflare", "--cf")) return ADAPTERS.cloudflare;
  return ADAPTERS.vercel;
}
async function confirmAgentReadiness() {
  const scripts = projectScripts();
  if (!scripts["check:agents"]) return;
  process.stdout.write("\n  Checking Agent Readiness before deploy...\n");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  await run(npm, ["run", "check:agents"]);
}
async function runDeploy(args) {
  process.stdout.write("\n  Building production site...\n");
  const buildExit = await runFramework("build", "build");
  if (buildExit !== 0) return buildExit;
  await confirmAgentReadiness();
  const adapter = selectAdapter(args);
  const prod = args.hasFlag("--prod", "--production");
  process.stdout.write(`
  Deploying with ${adapter.label}...
`);
  const deployExit = await adapter.deploy(prod);
  if (deployExit !== 0) {
    process.stdout.write(
      "\n  Deploy did not complete. To deploy manually:\n    \u2022 Vercel:     npx vercel deploy --prod\n    \u2022 Cloudflare: npx wrangler pages deploy\n\n"
    );
    return deployExit;
  }
  const base = SITE_URL_HINT ?? "<your-url>";
  process.stdout.write(
    `
  Deployed via ${adapter.label}. Your docs now answer agents at:
    \u2022 ${base}/llms.txt
    \u2022 ${base}/ai.txt
    \u2022 ${base}/api/docs-index
    \u2022 ${base}/api/agent-readiness

`
  );
  return 0;
}

// src/index.ts
var [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  process.stderr.write("Error: dox requires Node.js >= 18\n");
  process.exit(1);
}
function requireProject() {
  if (!isDoxProject()) {
    process.stderr.write('\n  Not a Dox project (no docs.json here). Run "dox init" to scaffold one.\n\n');
    process.exit(1);
  }
}
async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (!args.command || args.command === "help") {
    process.stdout.write(helpText());
    return 0;
  }
  switch (args.command) {
    case "init":
    case "create":
      return runPackageBin("create-dox", "create-dox", args.rest);
    case "dev":
      requireProject();
      return runFramework("dev", "dev", args.positionals);
    case "build":
      requireProject();
      return runFramework("build", "build");
    case "start":
      requireProject();
      return runFramework("start", "start");
    case "deploy":
      requireProject();
      return runDeploy(args);
    case "check":
      requireProject();
      return runCheck(args);
    case "new":
      requireProject();
      return runNewPage(args);
    case "migrate":
      return runPackageBin("create-dox", "create-dox", ["migrate", ...args.rest]);
    case "translate":
      requireProject();
      return runPackageBin("create-dox", "create-dox", ["translate", ...args.rest]);
    case "mcp":
      return runPackageBin("@doxlabs/mcp", "dox-mcp", args.rest);
    default:
      process.stderr.write(`
  Unknown command: ${args.command}
`);
      process.stdout.write(helpText());
      return 1;
  }
}
main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(`
  Error: ${err instanceof Error ? err.message : String(err)}
`);
  process.exit(1);
});
