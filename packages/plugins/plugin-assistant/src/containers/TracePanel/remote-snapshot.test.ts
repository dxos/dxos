//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { buildExecutionGraph } from './execution-graph';

/**
 * Regression for sub-operations collapsing onto `main` when the event window in `buildSpanTree`
 * dropped the parent span's `operation.start`.
 *
 * The remote trace snapshot has 714 chronological events. The 4th `Run Routine` span hosts every
 * `Create object` / `Add schema` / `List schemas` / `Query` / `Add to context` sub-operation.
 * Its `operation.start` lives near the front of the stream (index 70). Before the fix, the
 * default `eventLimit = 300` would `slice(-300)` away that begin event, leaving the sub-ops'
 * `parentPid` lookup unsatisfied — they ended up as top-level collapsible spans rendering their
 * end commits on `main`.
 */
describe('TracePanel remote snapshot', () => {
  test('sub-operations land on their parent Routine branch, never on main', ({ expect }) => {
    const messages = loadRemoteTraceMessages();
    const { commits } = buildExecutionGraph({ traceMessages: messages });

    // Commits whose message starts with one of these names originate from sub-operations
    // (Trace.OperationEnd) — every one should live on the Routine's branch, never on `main`.
    const subOpPrefixes = ['Create object', 'Add schema', 'List schemas', 'Query', 'Add to context'];
    const isSubOpEnd = (message: string | undefined): boolean =>
      message !== undefined && subOpPrefixes.some((prefix) => message.startsWith(prefix));

    const subOpCommits = commits.filter((commit) => isSubOpEnd(commit.message));
    expect(subOpCommits.length).toBeGreaterThan(0);

    const onMain = subOpCommits.filter((commit) => commit.branch === 'main');
    expect(onMain).toEqual([]);

    // All sub-op end commits share the parent Routine's pid as their branch.
    const branches = new Set(subOpCommits.map((commit) => commit.branch));
    expect(branches.size).toBe(1);
    expect(branches.has('main')).toBe(false);
  });
});

interface RawMessage {
  meta?: Trace.Meta;
  isEphemeral?: boolean;
  events?: Array<{ type: string; timestamp: number; data?: unknown }>;
}

const loadRemoteTraceMessages = (): Trace.Message[] => {
  const snapshotPath = join(__dirname, '../../testing/data/trace-timeline-remote.dx.json');
  const json = JSON.parse(readFileSync(snapshotPath, 'utf8')) as unknown;

  const messages: Trace.Message[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node === null || typeof node !== 'object') {
      return;
    }
    const candidate = node as RawMessage & Record<string, unknown>;
    if (Array.isArray(candidate.events) && candidate.meta && typeof candidate.meta === 'object') {
      messages.push(
        Obj.make(Trace.Message, {
          meta: candidate.meta,
          isEphemeral: candidate.isEphemeral ?? false,
          events: candidate.events,
        }),
      );
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      visit(value);
    }
  };
  visit(json);
  return messages;
};
