#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

/**
 * Totals one UTC day of Depot CI spend across the org's repos and posts to Discord when the day ran
 * above the pace that would exceed the monthly limit.
 *
 *   node scripts/ci-spend.mjs [--day 2026-10-09] [--dry-run]
 *
 * Environment:
 *   CI_SPEND_REPOS            repo=workflowDir pairs, comma-separated (default dxos/dxos=.depot/workflows)
 *   CI_SPEND_MONTHLY_LIMIT    USD the org may spend per month across Depot (default 3000)
 *   CI_SPEND_FIXED_MONTHLY    USD of that limit Depot CI cannot see: plan base + GitHub Actions minutes (default 560)
 *   DISCORD_WEBHOOK           posted to when the day is over pace; printed instead when unset
 *   DEPOT_TOKEN               read by the `depot` CLI
 *   GH_TOKEN                  lets `gh` list the PRs whose runs the day's run lists cap off
 *
 * Depot's API reports durations but not runner sizes, so a job's vCPUs come from its `runs-on` in the
 * repo's workflow files; a job the files do not size counts at 8 vCPU, so the estimate errs high.
 */

import { execFile, execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const USD_PER_VCPU_SECOND = 0.00005;
const DEFAULT_VCPUS = 8;
const RUN_LIST_LIMIT = 200;
const TRIGGERS = ['pull_request', 'merge_group', 'push', 'schedule', 'workflow_dispatch'];

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const day = valueOf(args, '--day') ?? yesterday();
  const from = new Date(`${day}T00:00:00Z`);
  const to = new Date(from.getTime() + 24 * 3600 * 1000);
  const repos = (process.env.CI_SPEND_REPOS ?? 'dxos/dxos=.depot/workflows').split(',').map((pair) => {
    const [repo, dir] = pair.split('=');
    return { repo, vcpus: readRunnerSizes(dir) };
  });

  const perRepo = {};
  const perJob = {};
  for (const { repo, vcpus } of repos) {
    const runs = listRuns(repo, from, to);
    let usd = 0;
    const allMetrics = await pool(runs, 8, (run) => depotJsonAsync(['ci', 'metrics', '--run', run.run_id]));
    for (const metrics of allMetrics) {
      for (const workflow of metrics?.workflows ?? []) {
        for (const { job, attempts } of workflow.jobs ?? []) {
          for (const { attempt } of attempts ?? []) {
            if (!attempt.started_at || !attempt.finished_at) {
              continue;
            }
            const seconds = (new Date(attempt.finished_at) - new Date(attempt.started_at)) / 1000;
            const cost = seconds * sizeOf(vcpus, job.job_key) * USD_PER_VCPU_SECOND;
            usd += cost;
            const key = `${repo} ${job.job_key.replace(/:matrix-\d+$/, '')}`;
            perJob[key] = (perJob[key] ?? 0) + cost;
          }
        }
      }
    }
    perRepo[repo] = { usd, runs: runs.length };
  }

  const total = Object.values(perRepo).reduce((sum, { usd }) => sum + usd, 0);
  const limit = Number(process.env.CI_SPEND_MONTHLY_LIMIT ?? 3000);
  const fixed = Number(process.env.CI_SPEND_FIXED_MONTHLY ?? 560);
  const pace = (limit - fixed) / daysInMonth(from);
  const lines = [
    `Depot CI spend on ${day}: $${total.toFixed(0)} (pace for a $${limit} month: $${pace.toFixed(0)}/day)`,
    ...Object.entries(perRepo).map(([repo, { usd, runs }]) => `  ${repo}: $${usd.toFixed(0)} across ${runs} runs`),
    'Top jobs:',
    ...Object.entries(perJob)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([job, usd]) => `  ${job}: $${usd.toFixed(0)}`),
  ];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
  }

  if (total <= pace) {
    return;
  }
  const message = `:warning: ${lines[0]} — over pace by $${(total - pace).toFixed(0)}.\n${lines.slice(1).join('\n')}`;
  if (dryRun || !process.env.DISCORD_WEBHOOK) {
    console.log(`\nWould post to Discord:\n${message}`);
    return;
  }
  const response = await fetch(process.env.DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: message.slice(0, 1900) }),
  });
  if (!response.ok) {
    throw new Error(`Discord answered ${response.status}`);
  }
};

/** Every run the repo created in [from, to), topping up capped run lists with per-PR lists. */
const listRuns = (repo, from, to) => {
  const runs = new Map();
  const inWindow = (run) => new Date(run.created_at) >= from && new Date(run.created_at) < to;
  const add = (list) => list.filter(inWindow).forEach((run) => runs.set(run.run_id, run));
  for (const trigger of TRIGGERS) {
    const list = runList(repo, ['--trigger', trigger]);
    add(list);
    const capped = list.length >= RUN_LIST_LIMIT && list.every((run) => new Date(run.created_at) >= from);
    if (!capped) {
      continue;
    }
    if (trigger !== 'pull_request') {
      console.error(`::warning::${repo} ${trigger}: more than ${RUN_LIST_LIMIT} runs on the day; total understated.`);
      continue;
    }
    for (const number of updatedPullRequests(repo, from)) {
      add(runList(repo, ['--pr', String(number)]));
    }
  }
  return [...runs.values()];
};

const runList = (repo, filter) =>
  depotJson([
    'ci',
    'run',
    'list',
    '--repo',
    repo,
    ...filter,
    ...['finished', 'failed', 'cancelled'].flatMap((status) => ['--status', status]),
    '-n',
    String(RUN_LIST_LIMIT),
  ]) ?? [];

const updatedPullRequests = (repo, from) => {
  try {
    const output = execFileSync(
      'gh',
      [
        'pr',
        'list',
        '--repo',
        repo,
        '--state',
        'all',
        '--search',
        `updated:>=${from.toISOString().slice(0, 10)}`,
        '--limit',
        '1000',
        '--json',
        'number',
        '-q',
        '.[].number',
      ],
      { encoding: 'utf8' },
    );
    return output.split('\n').filter(Boolean);
  } catch (err) {
    console.error(`::warning::${repo}: could not list PRs (${err.message}); total understated.`);
    return [];
  }
};

const depotJson = (args) => {
  try {
    const output = execFileSync('depot', [...args, '-o', 'json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) || !parsed.runs ? parsed : parsed.runs;
  } catch {
    return undefined;
  }
};

const depotJsonAsync = async (args) => {
  try {
    const { stdout } = await promisify(execFile)('depot', [...args, '-o', 'json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch {
    return undefined;
  }
};

/** `file.yml:job` → vCPUs, from each job's `runs-on`; a job calling a reusable workflow maps to that file. */
const readRunnerSizes = (dir) => {
  const sizes = {};
  const calls = {};
  if (!dir || !existsSync(dir)) {
    console.error(`::warning::no workflow files at ${dir}; its jobs count at ${DEFAULT_VCPUS} vCPU.`);
    return { sizes, calls };
  }
  for (const file of readdirSync(dir).filter((name) => /\.ya?ml$/.test(name))) {
    let job;
    let inJobs = false;
    for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
      if (/^jobs:\s*$/.test(line)) {
        inJobs = true;
      } else if (/^\S/.test(line)) {
        inJobs = false;
      } else if (inJobs && /^ {2}([\w-]+):\s*$/.test(line)) {
        job = line.trim().slice(0, -1);
      } else if (inJobs && job) {
        const runsOn = /^ {4}runs-on:\s*(\S+)/.exec(line)?.[1];
        const uses = /^ {4}uses:\s*\.\/\.depot\/workflows\/(\S+)/.exec(line)?.[1];
        if (runsOn) {
          sizes[`${file}:${job}`] = vcpusOf(runsOn);
        }
        if (uses) {
          calls[`${file}:${job}`] = uses;
        }
      }
    }
  }
  return { sizes, calls };
};

const vcpusOf = (label) => {
  const size = /^depot-ubuntu-[\d.]+(?:-arm)?-(\d+)$/.exec(label)?.[1];
  if (size) {
    return Number(size);
  }
  return /^depot-ubuntu-(?:latest|[\d.]+(?:-arm)?)$/.test(label) ? 2 : DEFAULT_VCPUS;
};

/** Sizes `check.yml:test-node:matrix-0` or a reusable workflow's `deploy-main.yml:deploy-edge:deploy:matrix-3`. */
const sizeOf = ({ sizes, calls }, jobKey) => {
  const [file, job, inner] = jobKey.replace(/:matrix-\d+$/, '').split(':');
  if (inner && calls[`${file}:${job}`]) {
    return sizes[`${calls[`${file}:${job}`]}:${inner}`] ?? DEFAULT_VCPUS;
  }
  return sizes[`${file}:${job}`] ?? DEFAULT_VCPUS;
};

/** Maps `items` through async `fn` with at most `limit` calls in flight. */
const pool = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
};

const valueOf = (args, flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const yesterday = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

const daysInMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();

await main();
