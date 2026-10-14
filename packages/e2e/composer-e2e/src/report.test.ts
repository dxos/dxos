//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EVENT_NAME, type JsonReport, toBatch, toEvents } from './report.ts';

const STARTED_AT = '2026-09-20T04:00:00.000Z';

describe('toEvents', () => {
  test('maps a passing test to one row per browser', ({ expect }) => {
    const events = toEvents(
      report([
        fileSuite('basic.spec.ts', {
          title: 'Basic tests',
          specs: [
            {
              title: 'create document',
              file: 'basic.spec.ts',
              line: 42,
              tags: ['@QA-1'],
              tests: [
                { projectName: 'chromium', status: 'expected', results: [{ status: 'passed', duration: 1234 }] },
                { projectName: 'firefox', status: 'expected', results: [{ status: 'passed', duration: 2345 }] },
              ],
            },
          ],
        }),
      ]),
      { packageName: 'composer-e2e' },
    );

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      event: EVENT_NAME,
      timestamp: STARTED_AT,
      properties: {
        package: 'composer-e2e',
        file: 'basic.spec.ts',
        suite: 'Basic tests',
        // The describe chain is part of the name, so two files may each hold a "create document".
        test: 'Basic tests › create document',
        browser: 'chromium',
        qa: '@QA-1',
        status: 'passed',
        failed: false,
        durationMs: 1234,
        line: 42,
      },
    });
    // The id separates the browsers, or a per-test table would collapse three cells into one row.
    expect(events[0].properties.testId).not.toEqual(events[1].properties.testId);
  });

  test('carries the failure message, stripped of ANSI and truncated', ({ expect }) => {
    const [event] = toEvents(
      report([
        fileSuite('chat.spec.ts', {
          title: 'Chat',
          specs: [
            {
              title: 'sends a message',
              file: 'chat.spec.ts',
              tags: ['@QA-4'],
              tests: [
                {
                  projectName: 'chromium',
                  status: 'unexpected',
                  results: [
                    {
                      status: 'failed',
                      duration: 60_000,
                      error: { message: `\u001B[31mexpected\u001B[0m ${'x'.repeat(400)}` },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ]),
      { packageName: 'composer-e2e' },
    );

    expect(event.properties.status).toEqual('failed');
    expect(event.properties.failed).toEqual(true);
    const error = String(event.properties.error);
    expect(error.startsWith('expected ')).toBe(true);
    expect(error).toHaveLength(300);
  });

  test('publishes skipped tests rather than dropping them', ({ expect }) => {
    // A suite that silently skips is the failure this chart exists to catch: with no row, a spec
    // that disabled itself is indistinguishable from one that was deleted.
    const [event] = toEvents(
      report([
        fileSuite('tables.spec.ts', {
          title: 'Table tests',
          specs: [
            {
              title: 'create',
              file: 'tables.spec.ts',
              tags: ['@table:QA-1'],
              tests: [{ projectName: 'webkit', status: 'skipped', results: [{ status: 'skipped', duration: 0 }] }],
            },
          ],
        }),
      ]),
      { packageName: 'composer-e2e' },
    );

    expect(event.properties.status).toEqual('skipped');
    expect(event.properties.failed).toEqual(false);
    expect(event.properties.qa).toEqual('@table:QA-1');
  });

  test('an unknown reporter status is reported as a failure, not dropped', ({ expect }) => {
    const [event] = toEvents(
      report([
        fileSuite('halo.spec.ts', {
          title: 'HALO tests',
          specs: [
            {
              title: 'join new identity',
              file: 'halo.spec.ts',
              tags: ['@QA-7'],
              tests: [{ projectName: 'chromium', status: 'interrupted', results: [] }],
            },
          ],
        }),
      ]),
      { packageName: 'composer-e2e' },
    );

    expect(event.properties.status).toEqual('failed');
    expect(event.properties.durationMs).toEqual(0);
  });

  test('a rerun of one run produces identical dedup keys', ({ expect }) => {
    const suites = [
      fileSuite('tour.spec.ts', {
        title: 'Tour tests',
        specs: [
          {
            title: 'the global tour advances',
            file: 'tour.spec.ts',
            tags: ['@QA-9'],
            tests: [{ projectName: 'chromium', status: 'expected', results: [{ status: 'passed', duration: 10 }] }],
          },
        ],
      }),
    ];
    const first = toEvents(report(suites), { packageName: 'composer-e2e' });
    const second = toEvents(report(suites), { packageName: 'composer-e2e' });

    // Same run, same rows: `ci-event.mjs` seeds its uuid from (commit, dedup), so a re-published
    // batch has to collapse onto the rows it already sent rather than doubling the counts.
    expect(second[0].dedup).toEqual(first[0].dedup);
    expect(second[0].timestamp).toEqual(first[0].timestamp);

    // A DIFFERENT run must not: two nightlies days apart routinely sit on one commit, so if the
    // run did not reach the key they would share a uuid and the second night would be dropped.
    const later = toEvents(report(suites), { packageName: 'composer-e2e', startedAt: '2026-09-21T04:00:00.000Z' });
    expect(later[0].dedup).not.toEqual(first[0].dedup);
  });

  test('an explicit start time wins over the report stats', ({ expect }) => {
    const [event] = toEvents(
      report([
        fileSuite('basic.spec.ts', {
          title: 'Basic tests',
          specs: [
            {
              title: 'create document',
              file: 'basic.spec.ts',
              tests: [{ projectName: 'chromium', status: 'expected', results: [] }],
            },
          ],
        }),
      ]),
      { packageName: 'composer-e2e', startedAt: '2026-01-01T00:00:00.000Z' },
    );

    expect(event.timestamp).toEqual('2026-01-01T00:00:00.000Z');
  });

  test('an empty report yields no events', ({ expect }) => {
    expect(toEvents({}, { packageName: 'composer-e2e' })).toEqual([]);
  });
});

describe('toBatch', () => {
  test('writes one JSON object per line, newline-terminated', ({ expect }) => {
    const events = toEvents(
      report([
        fileSuite('basic.spec.ts', {
          title: 'Basic tests',
          specs: [
            {
              title: 'create document',
              file: 'basic.spec.ts',
              tags: ['@QA-1'],
              tests: [
                { projectName: 'chromium', status: 'expected', results: [{ status: 'passed', duration: 1 }] },
                { projectName: 'firefox', status: 'expected', results: [{ status: 'passed', duration: 2 }] },
              ],
            },
          ],
        }),
      ]),
      { packageName: 'composer-e2e' },
    );

    const batch = toBatch(events);
    expect(batch.endsWith('\n')).toBe(true);
    const lines = batch.trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).event).toEqual(EVENT_NAME);
  });
});

/**
 * The shape Playwright's JSON reporter writes: a file-level suite whose title IS its path, the
 * describe blocks nested under it, and one `tests` entry per project.
 */
const report = (specs: JsonReport['suites']): JsonReport => ({ suites: specs, stats: { startTime: STARTED_AT } });

const fileSuite = (file: string, inner: NonNullable<JsonReport['suites']>[number]) => ({
  title: file,
  file,
  suites: [inner],
});
