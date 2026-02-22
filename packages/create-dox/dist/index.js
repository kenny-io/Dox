#!/usr/bin/env node
import {
  migrateDocs,
  parseGitHubUrl
} from "./chunk-P7NC3UJE.js";
import {
  logo,
  scaffold,
  slugify,
  success
} from "./chunk-QJJKSAOE.js";

// src/index.ts
import { existsSync as existsSync2, readdirSync as readdirSync2 } from "fs";
import { resolve as resolve2 } from "path";

// src/prompts.ts
import { input, select } from "@inquirer/prompts";
import { basename } from "path";
import { resolve } from "path";
async function gatherAnswers(dirArg, useDefaults) {
  let projectDir;
  if (dirArg) {
    projectDir = resolve(dirArg);
  } else if (useDefaults) {
    projectDir = resolve("my-docs");
  } else {
    const dirName = await input({
      message: "  Project directory:",
      default: "my-docs"
    });
    projectDir = resolve(dirName);
  }
  const defaultName = basename(projectDir).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const projectName = useDefaults ? defaultName : await input({
    message: "  Project name:",
    default: defaultName
  });
  const defaultDesc = `Documentation for ${projectName}.`;
  const description = useDefaults ? defaultDesc : await input({
    message: "  Description:",
    default: defaultDesc
  });
  const brandPreset = useDefaults ? "primary" : await select({
    message: "  Brand preset:",
    choices: [
      { name: "primary", value: "primary" },
      { name: "secondary", value: "secondary" }
    ],
    default: "primary"
  });
  const repoUrl = useDefaults ? "" : await input({
    message: "  GitHub repo URL (optional):",
    default: ""
  });
  let doInstall = true;
  if (!useDefaults) {
    const shouldInstall = await input({
      message: "  Install dependencies? (Y/n):",
      default: "Y"
    });
    doInstall = shouldInstall.toLowerCase() !== "n";
  }
  return { projectDir, projectName, description, brandPreset, repoUrl, doInstall };
}

// src/check.ts
import { existsSync, readFileSync as readFileSync2, readdirSync, statSync } from "fs";
import { join as join2, extname, relative } from "path";
import matter from "gray-matter";

// src/docs-json.ts
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
function readDocsJson(projectDir) {
  const docsPath = join(projectDir, "docs.json");
  const raw = readFileSync(docsPath, "utf8");
  return JSON.parse(raw);
}
function writeDocsJson(projectDir, config) {
  const docsPath = join(projectDir, "docs.json");
  writeFileSync(docsPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

// src/check.ts
function collectNavPageIds(groups, seen, duplicates) {
  for (const page of groups) {
    if (typeof page === "string") {
      if (seen.has(page)) {
        duplicates.add(page);
      } else {
        seen.add(page);
      }
    } else if (page.pages) {
      collectNavPageIds(page.pages, seen, duplicates);
    }
  }
}
function scanMdx(dir, results) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = join2(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scanMdx(fullPath, results);
      } else if (extname(entry).toLowerCase() === ".mdx") {
        results.push(fullPath);
      }
    } catch {
    }
  }
}
function addOrphanToNav(projectDir, pageId) {
  const config = readDocsJson(projectDir);
  const tab = config.tabs.find((t) => !t.href && !t.api && t.groups && t.groups.length > 0);
  if (!tab?.groups) return;
  const lastGroup = tab.groups[tab.groups.length - 1];
  const existing = lastGroup.pages.filter((p) => typeof p === "string");
  if (!existing.includes(pageId)) {
    lastGroup.pages.push(pageId);
    writeDocsJson(projectDir, config);
  }
}
async function runCheck(projectDir, fix) {
  if (!existsSync(join2(projectDir, "docs.json"))) {
    console.error(`
  \u274C Not a Dox project: docs.json not found in ${projectDir}
`);
    return 1;
  }
  const contentDir = join2(projectDir, "src", "content");
  const issues = [];
  const config = readDocsJson(projectDir);
  const navPageIds = /* @__PURE__ */ new Set();
  const duplicates = /* @__PURE__ */ new Set();
  for (const tab of config.tabs) {
    if (tab.href || tab.api) continue;
    if (!tab.groups || tab.groups.length === 0) {
      issues.push({ severity: "error", message: `Tab "${tab.tab}" has no groups and no href \u2014 it will render empty` });
      continue;
    }
    collectNavPageIds(tab.groups.map((g) => g), navPageIds, duplicates);
  }
  for (const dup of duplicates) {
    issues.push({ severity: "error", message: `[duplicate] "${dup}" appears more than once in docs.json` });
  }
  for (const pageId of navPageIds) {
    const candidates = [
      join2(contentDir, `${pageId}.mdx`),
      join2(contentDir, `${pageId}/index.mdx`)
    ];
    if (!candidates.some((c) => existsSync(c))) {
      issues.push({
        severity: "error",
        message: `"${pageId}" is in docs.json but has no MDX file`,
        file: `src/content/${pageId}.mdx`
      });
    }
  }
  const allFiles = [];
  if (existsSync(contentDir)) scanMdx(contentDir, allFiles);
  const fixedOrphans = [];
  for (const filePath of allFiles) {
    const rel = filePath.slice(contentDir.length + 1).replace(/\.mdx$/, "").replace(/\\/g, "/");
    const pageId = rel.endsWith("/index") ? rel.slice(0, -6) : rel;
    if (!navPageIds.has(pageId)) {
      if (fix) {
        addOrphanToNav(projectDir, pageId);
        fixedOrphans.push(pageId);
      } else {
        issues.push({
          severity: "warning",
          message: `"${pageId}" is not in docs.json nav (orphan)`,
          file: relative(projectDir, filePath)
        });
      }
    }
    let data = {};
    let content = "";
    try {
      const raw = readFileSync2(filePath, "utf8");
      const parsed = matter(raw);
      data = parsed.data;
      content = parsed.content;
    } catch {
      issues.push({ severity: "error", message: `Could not parse frontmatter`, file: relative(projectDir, filePath) });
      continue;
    }
    const rel2 = relative(projectDir, filePath);
    if (!data.title) {
      issues.push({ severity: "warning", message: `Missing "title" in frontmatter`, file: rel2 });
    }
    if (!data.description) {
      issues.push({ severity: "warning", message: `Missing "description" in frontmatter`, file: rel2 });
    }
    if (content.trim().length < 50) {
      issues.push({ severity: "warning", message: `Very short body (${content.trim().length} chars) \u2014 page may be empty`, file: rel2 });
    }
  }
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  console.log(`
  Linting ${projectDir}...
`);
  if (errors.length === 0 && warnings.length === 0 && fixedOrphans.length === 0) {
    console.log("  \u2705 No issues found.\n");
    return 0;
  }
  console.log(`  \u274C ${errors.length} error${errors.length !== 1 ? "s" : ""}, \u26A0\uFE0F  ${warnings.length} warning${warnings.length !== 1 ? "s" : ""}
`);
  if (errors.length > 0) {
    console.log("  ERRORS:");
    for (const issue of errors) {
      console.log(`    ${issue.message}`);
      if (issue.file) console.log(`    \u2192 ${issue.file}`);
    }
    console.log("");
  }
  if (warnings.length > 0) {
    console.log("  WARNINGS:");
    for (const issue of warnings) {
      console.log(`    ${issue.message}`);
      if (issue.file) console.log(`    \u2192 ${issue.file}`);
    }
    console.log("");
  }
  if (fixedOrphans.length > 0) {
    console.log(`  \u2705 Auto-fixed ${fixedOrphans.length} orphan page${fixedOrphans.length > 1 ? "s" : ""} (added to nav):`);
    for (const p of fixedOrphans) console.log(`    + ${p}`);
    console.log("");
  }
  if (!fix && warnings.some((w) => w.message.includes("orphan"))) {
    console.log("  Tip: run with --fix to auto-add orphan pages to navigation.\n");
  }
  return errors.length > 0 ? 1 : 0;
}

// src/index.ts
var args = process.argv.slice(2);
var flags = args.filter((a) => a.startsWith("-"));
var positional = args.filter((a) => !a.startsWith("-"));
function getFlagValue(flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith("-")) {
    return args[idx + 1];
  }
  return void 0;
}
async function runMigrateCommand() {
  const sourceUrl = positional[1];
  if (!sourceUrl) {
    console.error("\n  \u274C Source URL is required.");
    console.error("     Usage: create-dox migrate <github-url> [output-dir] [options]");
    console.error("     Example: create-dox migrate https://github.com/mintlify/docs my-docs");
    process.exit(1);
  }
  let parsedSource;
  try {
    parsedSource = parseGitHubUrl(sourceUrl);
  } catch (err) {
    console.error(`
  \u274C ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  const apiKey = getFlagValue("--api-key") ?? process.env.ANTHROPIC_API_KEY;
  const intoDir = getFlagValue("--into");
  const isInto = Boolean(intoDir);
  let projectDir;
  if (intoDir) {
    projectDir = resolve2(intoDir);
  } else if (positional[2]) {
    projectDir = resolve2(positional[2]);
  } else {
    projectDir = resolve2(`${slugify(parsedSource.repo)}-docs`);
  }
  const branch = getFlagValue("--branch");
  const docsDir = getFlagValue("--docs-dir");
  const yes = flags.includes("--yes") || flags.includes("-y");
  logo();
  console.log("  \u{1F680} Dox Migrate");
  console.log("");
  console.log(`  Source:  ${sourceUrl}`);
  console.log(`  Target:  ${projectDir}`);
  if (branch) console.log(`  Branch:  ${branch}`);
  if (docsDir) console.log(`  Docs dir: ${docsDir}`);
  console.log("");
  if (!apiKey) {
    console.warn("  \u26A0  No API key provided. Non-Markdown files will be skipped.");
    console.warn("     Set ANTHROPIC_API_KEY=... or pass --api-key <key> to convert them.");
    console.warn("");
  }
  await migrateDocs({
    sourceUrl,
    projectDir,
    into: isInto,
    apiKey,
    branch,
    docsDir,
    yes
  });
}
async function runScaffoldCommand() {
  const useDefaults = flags.includes("--yes") || flags.includes("-y");
  const dirArg = positional[0];
  if (dirArg) {
    const resolved = resolve2(dirArg);
    if (existsSync2(resolved) && readdirSync2(resolved).length > 0) {
      console.error(`
  \u274C Directory "${resolved}" already exists and is not empty.`);
      process.exit(1);
    }
  }
  const answers = await gatherAnswers(dirArg, useDefaults);
  const result = await scaffold({
    projectDir: answers.projectDir,
    projectName: answers.projectName,
    description: answers.description,
    brandPreset: answers.brandPreset,
    repoUrl: answers.repoUrl,
    doInstall: answers.doInstall
  });
  success(result.projectDir, answers.projectName);
}
async function runCheckCommand() {
  const projectDir = resolve2(positional[1] ?? ".");
  const fix = flags.includes("--fix");
  const exitCode = await runCheck(projectDir, fix);
  process.exit(exitCode);
}
async function main() {
  const subcommand = positional[0];
  if (subcommand === "migrate") {
    await runMigrateCommand();
  } else if (subcommand === "check") {
    await runCheckCommand();
  } else {
    logo();
    await runScaffoldCommand();
  }
}
main().catch((err) => {
  console.error("\n  \u274C Error:", err.message);
  process.exit(1);
});
