#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

/**
 * Shows CI status and failures for the current branch.
 * Uses the `gh` CLI (must be authenticated via `gh auth login` or GITHUB_TOKEN).
 *
 * Usage:
 *   pnpm -w gh-action            # Show current CI status and failures.
 *   pnpm -w gh-action --watch    # Poll until all runs complete, then show failures.
 */

import chalk from 'chalk';
import { execSync } from 'child_process';

const REPO_ROOT = process.cwd();
const WATCH = process.argv.includes('--watch');
const POLL_INTERVAL = 20_000;

main();

async function main() {
  ensureGhCli();

  const branch = getCurrentBranch();
  const head = getCurrentCommit();

  console.log(chalk.gray(`Branch: ${branch}  HEAD: ${head.slice(0, 8)}`));
  warnIfDirty(branch);

  if (WATCH) {
    while (true) {
      console.clear();
      console.log(chalk.gray(`Branch: ${branch}  HEAD: ${head.slice(0, 8)}`));
      warnIfDirty(branch);

      const exitCode = await showStatus(branch, head);
      if (exitCode !== 2) {
        process.exit(exitCode);
      }
      await sleep(POLL_INTERVAL);
    }
  } else {
    const exitCode = await showStatus(branch, head);
    process.exit(exitCode);
  }
}

/**
 * Fetch and display CI status for the given branch. Returns exit code.
 *   0 = all passed, 1 = failures, 2 = still running.
 */
async function showStatus(branch, head) {
  const runs = listRuns(branch);
  if (runs.length === 0) {
    console.log(chalk.yellow('\nNo workflow runs found for this branch.'));
    console.log(chalk.gray('Push your branch and ensure a workflow is configured.'));
    return 1;
  }

  const latestSha = runs[0].headSha;
  const relevant = runs.filter((run) => run.headSha === latestSha);

  if (latestSha !== head) {
    console.log(chalk.yellow(`⚠️  CI run is for ${latestSha.slice(0, 8)}, HEAD is ${head.slice(0, 8)}`));
    const unpushed = getUnpushedCommits(branch);
    if (unpushed) {
      console.log(chalk.yellow('   Unpushed commits:'));
      for (const line of unpushed.split('\n')) {
        console.log(chalk.yellow(`     ${line}`));
      }
    }
  }

  console.log();

  let hasFailures = false;
  let hasPending = false;
  const failedRuns = [];

  for (const run of relevant) {
    const icon = statusIcon(run);
    const status = statusText(run);
    const time = elapsed(run);
    console.log(`${icon} ${run.name} ${status} ${chalk.gray(time)} ${chalk.blueBright(run.url)}`);

    if (run.status !== 'completed') {
      hasPending = true;
    }
    if (run.conclusion === 'failure') {
      hasFailures = true;
      failedRuns.push(run);
    }
  }

  if (hasFailures) {
    for (const run of failedRuns) {
      await showFailures(run);
    }
  }

  if (hasPending) {
    console.log(chalk.yellow('\n⏳ Workflows still running...'));
    return 2;
  }

  if (!hasFailures) {
    console.log(chalk.green('\n✅ All checks passed.'));
    return 0;
  }

  return 1;
}

/**
 * Fetch and display failure details for a single workflow run.
 */
async function showFailures(run) {
  console.log(chalk.red(`\n--- ${run.name} ---`));

  const jobs = getRunJobs(run.databaseId);
  const failedJobs = jobs.filter((job) => job.conclusion === 'failure');

  for (const job of failedJobs) {
    console.log(chalk.red(`\n❌ ${job.name}`));
    if (job.url) {
      console.log(chalk.gray(`   ${job.url}`));
    }
    if (job.steps) {
      for (const step of job.steps.filter((step) => step.conclusion === 'failure')) {
        console.log(chalk.red(`   Failed step: ${step.name}`));
      }
    }
  }

  let logs;
  try {
    logs = ghExec(`run view ${run.databaseId} --log-failed`);
  } catch {
    console.log(chalk.gray('\n   Could not fetch logs.'));
    return;
  }

  if (!logs) {
    return;
  }

  logs = logs.replaceAll('/__w/dxos/dxos/', '');

  const failedTasks = parseTaskLogs(logs);

  if (failedTasks.length > 0) {
    console.log();
    for (const task of failedTasks) {
      console.log(chalk.red(`❌ Task: ${task.name}`));
      const tail = task.logs.slice(-100);
      if (task.logs.length > 100) {
        console.log(chalk.gray(`   ... (${task.logs.length - 100} lines omitted)`));
      }
      for (const line of tail) {
        printLogLine(line);
      }
      console.log();
    }
    console.log(
      chalk.yellow(`📊 ${failedTasks.length} failed task(s): ${failedTasks.map((task) => task.name).join(', ')}`),
    );
  } else {
    // No moon task failures detected — extract error-relevant lines instead.
    const errorLines = logs
      .split('\n')
      .map(stripGhLogPrefix)
      .filter((line) => /Error:|##\[error\]|failed to run|FAILED|error\[/.test(line));

    if (errorLines.length > 0) {
      console.log(chalk.gray('\n--- Errors ---'));
      for (const line of errorLines.slice(0, 50)) {
        printLogLine(line);
      }
    } else {
      const lines = logs.split('\n').map(stripGhLogPrefix).slice(-200);
      console.log(chalk.gray('\n--- Logs (last 200 lines) ---'));
      for (const line of lines) {
        printLogLine(line);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Moon task log parsing.
// ---------------------------------------------------------------------------

/**
 * Parse moon CI task logs and extract failed tasks.
 * Handles both raw log format and `gh run view --log-failed` tab-prefixed format.
 */
function parseTaskLogs(rawLogs) {
  const tasks = new Map();

  for (const rawLine of rawLogs.split('\n')) {
    // `gh run view --log-failed` prefixes each line with job\tstep\t
    const tabs = rawLine.split('\t');
    const line = tabs.length >= 3 ? tabs.slice(2).join('\t') : rawLine;

    // Moon task format: <timestamp> <task_name> | <content>
    const match = line.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z\s+([^|]+)\s*\|(.*)$/);
    if (match) {
      const taskName = match[1].trim();
      const content = match[2];

      if (!tasks.has(taskName)) {
        tasks.set(taskName, { name: taskName, logs: [], failed: false });
      }

      const task = tasks.get(taskName);
      task.logs.push(content);

      if (content.includes(`Task ${taskName} failed to run.`)) {
        task.failed = true;
      }
    } else if (rawLine.includes('failed to run.')) {
      const failMatch = rawLine.match(/Task ([^\s]+) failed to run\./);
      if (failMatch && tasks.has(failMatch[1])) {
        tasks.get(failMatch[1]).failed = true;
      }
    }
  }

  return [...tasks.values()].filter((task) => task.failed);
}

// ---------------------------------------------------------------------------
// Display helpers.
// ---------------------------------------------------------------------------

function statusIcon(run) {
  if (run.status !== 'completed') {
    return '⏳';
  }
  switch (run.conclusion) {
    case 'success':
      return '✅';
    case 'failure':
      return '❌';
    default:
      return '⚠️';
  }
}

function statusText(run) {
  if (run.status !== 'completed') {
    return chalk.yellow(run.status);
  }
  switch (run.conclusion) {
    case 'success':
      return chalk.green('success');
    case 'failure':
      return chalk.red('failure');
    default:
      return chalk.yellow(run.conclusion);
  }
}

function elapsed(run) {
  const start = new Date(run.createdAt);
  const end = run.status === 'completed' ? new Date(run.updatedAt) : new Date();
  const diff = end - start;
  const mm = Math.floor(diff / 60000);
  const ss = Math.floor((diff % 60000) / 1000);
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

/**
 * Strip the `gh run view --log-failed` tab-separated prefix (job\tstep\t) and runner timestamp.
 */
function stripGhLogPrefix(line) {
  const tabs = line.split('\t');
  const content = tabs.length >= 3 ? tabs.slice(2).join('\t') : line;
  return content.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s*/, '');
}

function printLogLine(line) {
  if (/[Ee]rror|ERROR/.test(line)) {
    console.log(chalk.red(line));
  } else if (/[Ww]arning|WARN/.test(line)) {
    console.log(chalk.yellow(line));
  } else {
    console.log(line);
  }
}

// ---------------------------------------------------------------------------
// Git helpers.
// ---------------------------------------------------------------------------

function getCurrentBranch() {
  return git('rev-parse --abbrev-ref HEAD');
}

function getCurrentCommit() {
  return git('rev-parse HEAD');
}

function warnIfDirty(branch) {
  if (git('status --porcelain').length > 0) {
    console.log(chalk.yellow('⚠️  Uncommitted changes'));
  }
  try {
    const unpushed = git(`log origin/${branch}..HEAD --oneline`);
    if (unpushed) {
      console.log(chalk.yellow('⚠️  Unpushed commits'));
    }
  } catch {
    // Remote tracking branch may not exist yet.
  }
}

function getUnpushedCommits(branch) {
  try {
    return git(`log origin/${branch}..HEAD --oneline`) || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GH CLI helpers.
// ---------------------------------------------------------------------------

function ensureGhCli() {
  try {
    ghExec('auth status');
  } catch {
    console.error(chalk.red('GitHub CLI not authenticated. Run: gh auth login'));
    process.exit(1);
  }
}

function listRuns(branch) {
  const fields = 'databaseId,name,status,conclusion,headSha,createdAt,updatedAt,url';
  const json = ghExec(`run list --branch "${branch}" --limit 20 --json ${fields}`);
  return JSON.parse(json);
}

function getRunJobs(runId) {
  const json = ghExec(`run view ${runId} --json jobs`);
  return JSON.parse(json).jobs;
}

// ---------------------------------------------------------------------------
// Shell execution helpers.
// ---------------------------------------------------------------------------

function git(args) {
  return execSync(`git ${args}`, {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function ghExec(args) {
  return execSync(`gh ${args}`, {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
