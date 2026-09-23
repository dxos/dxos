//
// Copyright 2026 DXOS.org
//

/**
 * Turns a Playwright JSON report into the PostHog events the e2e trend is built from.
 *
 * The JSON report rather than the JUnit XML the Trunk uploader consumes: the JSON carries the
 * project (browser) on every test, the per-attempt status and the describe chain as structure,
 * where JUnit flattens all three into `classname` strings that have to be re-parsed. Both are
 * written by `e2ePreset`, so this reads the one that already says what the trend needs.
 *
 * ONE EVENT PER TEST, never a per-run summary: a summary cannot answer "which tests are failing
 * now", and the counts a stacked chart needs are `count()` over these rows. The run-level facts
 * (commit, branch, run id) are attached by `scripts/ci-event.mjs`, which every CI publisher in this
 * repo goes through so the uuid seeding and property namespacing live in one place.
 */

import { createHash } from 'node:crypto';

/** The PostHog event name every test row is captured under. */
export const EVENT_NAME = 'ci.e2e-test';

/** How much of a failure message is worth carrying; the trace artifact holds the rest. */
const MAX_ERROR_LENGTH = 300;

/**
 * The outcome dimension a chart breaks down by.
 *
 * `flaky` is kept distinct from both `passed` and `failed` rather than folded into either: this
 * suite runs with `retries: 0`, so a `flaky` row can only come from a config that overrode it, and
 * silently counting it as a pass would make that override invisible on the very chart that exists
 * to show it.
 */
export type TestStatus = 'passed' | 'failed' | 'flaky' | 'skipped';

export type TestEvent = {
  event: string;
  timestamp: string;
  /** Discriminates rows sharing a commit, which would otherwise share a dedup uuid. */
  dedup: string;
  properties: Record<string, string | number | boolean>;
};

//
// The slice of Playwright's JSON report this reads. Declared structurally rather than imported from
// `@playwright/test`, which does not export the reporter's serialized shape.
//

type JsonResult = { status?: string; duration?: number; error?: { message?: string } };

type JsonTest = { projectName?: string; status?: string; results?: JsonResult[] };

type JsonSpec = { title: string; file?: string; line?: number; ok?: boolean; tags?: string[]; tests?: JsonTest[] };

type JsonSuite = { title?: string; file?: string; specs?: JsonSpec[]; suites?: JsonSuite[] };

export type JsonReport = { suites?: JsonSuite[]; stats?: { startTime?: string } };

/**
 * Playwright's own outcome vocabulary, mapped onto the four the trend charts.
 *
 * `unexpected` covers a failure and a timeout alike, and `expected` covers a passing test and a
 * passing `test.fail()`. An unknown value is reported as a failure rather than dropped: a status
 * this does not recognize means the reporter changed, and a silent drop would show up as the suite
 * quietly shrinking.
 */
const toStatus = (test: JsonTest): TestStatus => {
  switch (test.status) {
    case 'expected':
      return 'passed';
    case 'skipped':
      return 'skipped';
    case 'flaky':
      return 'flaky';
    default:
      return 'failed';
  }
};

/**
 * A test's identity across runs: where it lives and what it is called, per browser.
 *
 * Hashed rather than used raw so the property stays a fixed width in PostHog's person-less event
 * table, and stable under a rename of nothing but the file's directory — the path is relative to
 * the package, which is what `file` already holds.
 */
export const testId = (parts: readonly string[]): string =>
  createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);

const truncate = (text: string): string =>
  text.length <= MAX_ERROR_LENGTH ? text : `${text.slice(0, MAX_ERROR_LENGTH - 1)}…`;

/** Playwright wraps failure messages in ANSI colour even when the reporter output is a file. */
// eslint-disable-next-line no-control-regex
const stripAnsi = (text: string): string => text.replace(/\u001B\[[0-9;]*m/g, '');

/** Every spec in the tree, carrying the describe chain that reached it. */
const walk = function* (suites: readonly JsonSuite[], trail: readonly string[]): Generator<[JsonSpec, string[]]> {
  for (const suite of suites) {
    // The top-level suite of a Playwright report is the FILE, whose title is the file path; the
    // describe blocks nest below it. Only the latter belong in the suite name.
    const isFile = suite.file !== undefined && suite.title === suite.file;
    const next = isFile || !suite.title ? [...trail] : [...trail, suite.title];
    for (const spec of suite.specs ?? []) {
      yield [spec, next];
    }
    yield* walk(suite.suites ?? [], next);
  }
};

export type ReportOptions = {
  /** Package the suite belongs to, so a trend can chart one suite out of the whole e2e pool. */
  packageName: string;
  /**
   * When the run started, as the timestamp every one of its rows carries.
   *
   * The RUN's time, not the commit's, which is what `ci-event.mjs` would otherwise default to: two
   * nightlies days apart routinely sit on one commit, and dating by commit would collapse them onto
   * a single point — exactly the two nights a trend exists to tell apart.
   */
  startedAt?: string;
};

/**
 * One event per test per browser.
 *
 * A SKIPPED test is published like any other. It is tempting to drop them — they measured nothing —
 * but a suite that silently skips is the failure mode this chart is meant to catch: without the
 * row, a spec that disabled itself looks identical to one that was deleted, and the stack just gets
 * shorter with nothing to point at.
 */
export const toEvents = (report: JsonReport, options: ReportOptions): TestEvent[] => {
  const timestamp = options.startedAt ?? report.stats?.startTime ?? new Date().toISOString();
  const events: TestEvent[] = [];

  for (const [spec, trail] of walk(report.suites ?? [], [])) {
    const suite = trail.join(' › ');
    // The `@QA-n` tags bind this test to the `.mdl` flows it automates, so a chart can report on a
    // JOURNEY rather than on a file — and a flow whose rows all went red is the thing a reader of
    // the failing-tests table actually wants named.
    const qa = (spec.tags ?? []).filter((tag) => /^@?(?:[a-z-]+:)?QA-\d+$/.test(tag)).join(',');
    const title = [...trail, spec.title].join(' › ');
    for (const test of spec.tests ?? []) {
      const status = toStatus(test);
      const browser = test.projectName || 'unknown';
      // The LAST attempt is the outcome; with `retries: 0` there is exactly one, and where a config
      // overrode that, the final attempt is what `flaky` versus `failed` was decided on.
      const result = test.results?.[test.results.length - 1];
      const error = result?.error?.message;
      events.push({
        event: EVENT_NAME,
        timestamp,
        // The run's timestamp is in the key as defence in depth. `ci-event.mjs` seeds its uuid
        // from (commit, dedup) and PostHog's dedup tuple includes the timestamp, so two nightlies
        // on one commit would stay distinct without it — but that rests entirely on this event
        // being dated by the RUN, and if that ever changed the two nights would silently collapse
        // into one point. Re-publishing a run is still idempotent: the timestamp is the report's
        // own `stats.startTime`, not the moment of publishing.
        dedup: [options.packageName, spec.file ?? '', title, browser, timestamp].join('|'),
        properties: {
          package: options.packageName,
          file: spec.file ?? '',
          suite,
          test: title,
          testId: testId([options.packageName, spec.file ?? '', title, browser]),
          browser,
          qa,
          status,
          // A redundant boolean beside `status`, because a stacked count and a "currently failing"
          // table both filter on "is this a failure" and HogQL cannot index a string comparison.
          failed: status === 'failed',
          durationMs: result?.duration ?? 0,
          ...(spec.line !== undefined ? { line: spec.line } : {}),
          ...(error ? { error: truncate(stripAnsi(error)) } : {}),
        },
      });
    }
  }

  return events;
};

/** The NDJSON `scripts/ci-event.mjs --batch` consumes: one event per line. */
export const toBatch = (events: readonly TestEvent[]): string =>
  events.map((event) => JSON.stringify(event)).join('\n') + '\n';
