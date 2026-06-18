//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trace } from '@dxos/compute';
import { renderTimelineAscii } from '@dxos/react-ui-components';

import { buildExecutionGraph, collectProcessActivityLines, deriveInFlightActivityLine } from './execution-graph';
import subAgentFixture from './testing/sub-agent-delegation.json';

// Real trace captured from a live supervisor → sub-agent delegation via `dxosDumpTrace()`.
// External JSON → typed at this boundary; `buildExecutionGraph` reads only `meta`/`events`.
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
      ●        [atom] Agent processing request...
      ├──●     [info] Get Agent Context - Success
      │  ●     [user] create a sub-agent that creates a haiku in a new document
      │  ●     [info] Get Agent Context - Success
      │  ●     [check-square-offset] Update tasks - Success
      │  ●     [info] Get Agent Context - Success
      │  ●     [share-network] Delegate task - Success
      │  ●     [info] Get Agent Context - Success
      ◆──╯     [atom] Agent completed request
      │  ├──●  [brain] Run Routine
      │     ●  [info] Get Agent Context - Success
      │     ●  [user] Complete the following task and report the result concisely.
      │     ●  [info] Get Agent Context - Success
      ●     │  [pencil] Update Chat Name - Success
      │     ●  [file-text] Create - Success
      │     ●  [info] Get Agent Context - Success
      │     ●  [plus] Add artifact - Error
      │     ●  [info] Get Agent Context - Success
      │     ●  [wrench] completeJob - Success
      │     ●  [info] Get Agent Context - Success
      ◆─────╯  [brain] Run Routine - Success
      "
    `);
  });

  test('collects sub-agent activity lines for a delegated process pid', ({ expect }) => {
    const subAgentPid = 'cf8f7243-5b1d-4902-b158-70d9107d5f43';
    const lines = collectProcessActivityLines(messages, subAgentPid);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines).toContain('Run Routine');
    expect(lines[lines.length - 1]).toMatch(/Run Routine - Success/);
  });

  test('derives in-flight operation before completion', ({ expect }) => {
    const subAgentPid = 'cf8f7243-5b1d-4902-b158-70d9107d5f43';
    const partial = messages.slice(0, Math.floor(messages.length / 2));
    const line = deriveInFlightActivityLine(partial, subAgentPid);
    expect(line).toBeDefined();
  });
});
