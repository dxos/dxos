#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Writes CiRun events for the check runs on a pull request's latest commits, as
// `(event "CiRun" (field value)…)` forms for `deus event import` (D103).
//
//   node legacy/scripts/analytics-ci.mjs [--pr 13952] [--commits 30] [--repo dxos/dxos] > ci.sexp
//   deus event import ci.sexp
//
// Reads $GITHUB_TOKEN (or $GH_TOKEN); curl carries the request, so the sandbox's proxy applies.

import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    pr: { type: 'string', default: '13952' },
    commits: { type: 'string', default: '30' },
    repo: { type: 'string', default: 'dxos/dxos' },
  },
});

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (!token) {
  console.error('$GITHUB_TOKEN is not set');
  process.exit(1);
}

const get = (path) => {
  // The token goes through curl's stdin config, so it never appears in the process list.
  const out = execFileSync('curl', ['-sSf', '-K', '-', `https://api.github.com/repos/${values.repo}/${path}`], {
    input: `header = "Authorization: Bearer ${token}"\nheader = "Accept: application/vnd.github+json"\n`,
    maxBuffer: 1 << 26,
  });
  return JSON.parse(out.toString('utf8'));
};

/** A string as a DEUS s-expression string; control characters become spaces. */
const str = (text) =>
  `"${String(text ?? '')
    // oxlint-disable-next-line no-control-regex -- matching control characters is the point: they become spaces.
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')}"`;

const commits = [];
for (let page = 1; ; page++) {
  const batch = get(`pulls/${values.pr}/commits?per_page=100&page=${page}`);
  commits.push(...batch);
  if (batch.length < 100) {
    break;
  }
}

const latest = commits.slice(-Number(values.commits));
let events = 0;
for (const commit of latest) {
  const { check_runs: runs } = get(`commits/${commit.sha}/check-runs?per_page=100`);
  for (const run of runs) {
    if (run.status !== 'completed') {
      continue;
    }
    const seconds =
      run.started_at && run.completed_at
        ? Math.max(0, Math.round((Date.parse(run.completed_at) - Date.parse(run.started_at)) / 1000))
        : 0;
    const by = run.app?.slug ?? 'github';
    process.stdout.write(
      `(event "CiRun" (by ${str(by)}) (checkName ${str(run.name)}) (conclusion ${str(run.conclusion)}) ` +
        `(passed ${run.conclusion === 'success' || run.conclusion === 'skipped' || run.conclusion === 'neutral'}) ` +
        `(commitSha ${str(commit.sha)}) (pr ${Number(values.pr)}) (seconds ${seconds}) (runUrl ${str(run.html_url)}))\n`,
    );
    events++;
  }
}
console.error(`${events} check runs on ${latest.length} commits of #${values.pr}`);
