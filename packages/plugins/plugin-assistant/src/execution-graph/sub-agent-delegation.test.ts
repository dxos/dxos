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
      ├──●     [info] Get Agent Context
      │  ●     [info] Get Agent Context
      │  ●     [check-square-offset] Update tasks
      │  ●     [info] Get Agent Context
      │  ●     [share-network] Delegate task
      │  ●     [info] Get Agent Context
      │  ├──●  [brain] Run Routine
      │  │  ●  [info] Get Agent Context
      │  │  ●  [info] Get Agent Context
      │  │  ●  [file-text] Create
      │  │  ●  [info] Get Agent Context
      │  │  ●  [plus] Add artifact - Error
      │  │  ●  [info] Get Agent Context
      │  │  ●  [info] Get Agent Context
      │  │  ●  [user] Complete the following task and report the result concisely.
      │  │  ●  [wrench] completeJob
      ◆──┼──╯  [brain] Run Routine
      │  ●     [user] create a sub-agent that creates a haiku in a new document
      ◆──╯     [atom] Agent completed request
      ●        [pencil] Update Chat Name
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
