//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Trace from '@dxos/compute/Trace';

import { renderTimelineAscii } from '../components/Timeline/index.ts';
import { buildExecutionGraph, collectProcessActivityLines, deriveInFlightActivityLine } from './execution-graph.ts';
import subAgentFixture from './testing/sub-agent-delegation.json';

// Real trace captured from a live supervisor -> sub-agent delegation via `dxosDumpTrace()`.
// External JSON -> typed at this boundary; `buildExecutionGraph` reads only `meta`/`events`.
const messages = (subAgentFixture as unknown as Trace.Message[])
  .slice()
  .sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.events[0]?.timestamp ?? 0));

describe('sub-agent delegation fixture', () => {
  // Ground-truth render of a concurrent supervisor + sub-agent trace. Used to iterate on the
  // execution-graph lane layout (the sub-agent should occupy its own lane throughout).
  test('renders the delegation timeline', ({ expect }) => {
    const { commits, branches } = buildExecutionGraph({ traceMessages: messages });
    expect(`\n${renderTimelineAscii(commits, branches)}\n`).toMatchInlineSnapshot(`
      "
      *        [atom] Agent processing request...
      \u251C\u2500\u2500*     [info] Get Agent Context
      \u2502  *     [info] Get Agent Context
      \u2502  *     [check-square-offset] Update tasks
      \u2502  *     [info] Get Agent Context
      \u2502  *     [share-network] Delegate task
      \u2502  *     [info] Get Agent Context
      \u2502  \u251C\u2500\u2500*  [brain] Run Routine
      \u2502  \u2502  *  [info] Get Agent Context
      \u2502  \u2502  *  [info] Get Agent Context
      \u2502  \u2502  *  [file-text] Create
      \u2502  \u2502  *  [info] Get Agent Context
      \u2502  \u2502  *  [plus] Add artifact - Error
      \u2502  \u2502  *  [info] Get Agent Context
      \u2502  \u2502  *  [info] Get Agent Context
      \u2502  \u2502  *  [user] Complete the following task and report the result concisely.
      \u2502  \u2502  *  [wrench] completeJob
      \u25C6\u2500\u2500\u253C\u2500\u2500\u256F  [brain] Run Routine
      \u2502  *     [user] create a sub-agent that creates a haiku in a new document
      \u25C6\u2500\u2500\u256F     [atom] Agent completed request
      *        [pencil] Update Chat Name
      "
    `);
  });

  test('collects sub-agent activity lines for a delegated process pid', ({ expect }) => {
    const subAgentPid = 'cf8f7243-5b1d-4902-b158-70d9107d5f43';
    const lines = collectProcessActivityLines(messages, subAgentPid);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines).toContain('Run Routine');
    expect(lines[lines.length - 1]).toBe('Run Routine');
  });

  test('derives in-flight operation before completion', ({ expect }) => {
    const subAgentPid = 'cf8f7243-5b1d-4902-b158-70d9107d5f43';
    const partial = messages.slice(0, Math.floor(messages.length / 2));
    const line = deriveInFlightActivityLine(partial, subAgentPid);
    expect(line).toBeDefined();
  });
});
