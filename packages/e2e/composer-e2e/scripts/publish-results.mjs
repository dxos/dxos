#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

/**
 * Publishes the Playwright JSON reports left by an e2e run to PostHog as `ci.e2e-test` events.
 *
 *   node packages/e2e/composer-e2e/scripts/publish-results.mjs
 *   node packages/e2e/composer-e2e/scripts/publish-results.mjs --report <file.json> --dry-run
 *
 * Reads every `test-results/playwright/report/*.json` the run produced — the reporter names each
 * one after the package that owns the suite, so one invocation covers whichever suites the CI cell
 * happened to run and each row carries its own `ciPackage`.
 *
 * NEVER fails the build. It runs as an `always()` step after the suite, so a network error here
 * would turn a green run red and a red run unreadable; problems are reported as workflow warnings
 * and the exit code stays 0. The thing worth preventing is a SILENT loss, not the loss itself.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { toBatch, toEvents } from '../src/report.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../..');

const REPORT_DIR = path.join(WORKSPACE_ROOT, 'test-results', 'playwright', 'report');

const warn = (message) => console.log(`::warning::${message}`);

/** Reports written by this run. The reporter's file stem is the package directory name. */
const findReports = (explicit) => {
  if (explicit) {
    return existsSync(explicit) ? [explicit] : [];
  }
  if (!existsSync(REPORT_DIR)) {
    return [];
  }
  return readdirSync(REPORT_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(REPORT_DIR, name))
    .sort();
};

const main = () => {
  const { values } = parseArgs({
    options: {
      'report': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const reports = findReports(values.report);
  if (reports.length === 0) {
    // The normal case for a cache replay, which restores no outputs, and for a cell whose suite did
    // not run. Nothing to say beyond the note.
    console.log(
      `::notice::no Playwright report under ${path.relative(WORKSPACE_ROOT, REPORT_DIR)} — nothing to publish.`,
    );
    return;
  }

  const events = [];
  for (const report of reports) {
    const packageName = path.basename(report, '.json');
    try {
      events.push(...toEvents(JSON.parse(readFileSync(report, 'utf8')), { packageName }));
    } catch (err) {
      // One unreadable report must not cost the rows of the others: a reporter that crashed
      // mid-write is exactly when the surviving suites' results are worth having.
      warn(`could not read ${path.relative(WORKSPACE_ROOT, report)}: ${err.message}`);
    }
  }

  if (events.length === 0) {
    warn('the Playwright reports contained no tests — publishing nothing.');
    return;
  }

  const batch = path.join(REPORT_DIR, 'posthog-events.ndjson');
  // `--report` can name a file outside the default location, where this directory does not exist
  // yet; a script that promises never to fail must not die of ENOENT writing its own batch.
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(batch, toBatch(events));
  const counts = events.reduce((totals, event) => {
    totals[event.properties.status] = (totals[event.properties.status] ?? 0) + 1;
    return totals;
  }, {});
  console.log(
    `${events.length} test event(s) from ${reports.length} report(s): ` +
      Object.entries(counts)
        .map(([status, count]) => `${count} ${status}`)
        .join(', '),
  );

  if (values['dry-run']) {
    console.log(`wrote ${path.relative(WORKSPACE_ROOT, batch)} (dry run — not sent).`);
    return;
  }

  // The repo's one publisher: it seeds the dedup uuid, namespaces every property to `ci<Name>` and
  // attaches the GitHub envelope. A second implementation here would drift from the one every other
  // CI trend uses, and the drift would surface as duplicate rows.
  const result = spawnSync(process.execPath, [path.join(WORKSPACE_ROOT, 'scripts', 'ci-event.mjs'), '--batch', batch], {
    cwd: WORKSPACE_ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    warn(`publishing e2e results to PostHog failed (exit ${result.status ?? 'signal'}); the run itself is unaffected.`);
  }
};

// The step runs under `always()`, so a throw from the setup work outside `main`'s own try — arg
// parsing, creating the report directory, writing the batch — would fail a run it only observes.
try {
  main();
} catch (err) {
  warn(
    `publishing e2e results failed: ${err instanceof Error ? err.message : String(err)}; the run itself is unaffected.`,
  );
}
