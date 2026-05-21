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
    const messages = loadRemoteTraceMessages(REMOTE_SNAPSHOT);
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

  test('Routine end commits anchor to the previous main commit, not back to their own begin', ({ expect }) => {
    // Regression: the multi-Routine snapshot has overlapping top-level Routine spans (R2 starts
    // before R1 ends, R4 starts before R3 ends). Previously, R1.end's first parent was
    // R1.begin (looked up by `beginCommitIdBySpan`), which drew an edge across R2.begin in the
    // rendered timeline. The fix anchors end commits to the immediate predecessor on the
    // parent branch (R2.begin) and treats the own-branch tail as a separate merge parent.
    const messages = loadRemoteTraceMessages(MULTI_SNAPSHOT);
    const { commits } = buildExecutionGraph({ traceMessages: messages });

    const mainCommits = commits.filter((commit) => commit.branch === 'main');
    // Sanity check: 4 begin + 4 end Run-Routine commits on main.
    expect(mainCommits).toHaveLength(8);

    // For each commit on main, its first parent (if any) must be a commit that appears
    // *earlier* in the main commit sequence — no "skip-back" edges to an older begin commit.
    const idToMainIndex = new Map(mainCommits.map((commit, index) => [commit.id, index]));
    for (let index = 1; index < mainCommits.length; index += 1) {
      const commit = mainCommits[index];
      const onMainParents = (commit.parents ?? []).filter((parentId) => idToMainIndex.has(parentId));
      expect(onMainParents.length).toBeGreaterThan(0);
      for (const parentId of onMainParents) {
        const parentIndex = idToMainIndex.get(parentId)!;
        // Every parent on main must be the immediate predecessor (index - 1). An older parent
        // would render an edge that crosses over the intervening commits.
        expect(parentIndex).toBe(index - 1);
      }
    }
  });
});

const REMOTE_SNAPSHOT = 'trace-timeline-remote.dx.json';
const MULTI_SNAPSHOT = 'trace-timeline-multiple.dx.json';

interface RawMessage {
  meta?: Trace.Meta;
  isEphemeral?: boolean;
  events?: Array<{ type: string; timestamp: number; data: unknown }>;
}

const loadRemoteTraceMessages = (filename: string): Trace.Message[] => {
  const snapshotPath = join(__dirname, '../testing/data', filename);
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
