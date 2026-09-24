//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import { SpaceId, URI } from '@dxos/keys';

import { makeProcess } from '../../testing/index.ts';
import {
  ALL_PROCESS_ENVIRONMENTS,
  DEFAULT_PROCESS_ENVIRONMENTS,
  ProcessEnvironment,
  filterProcesses,
  filterProcessesBySelection,
  filterTraceMessages,
  parseProcessEnvironments,
  processEnvironment,
  toggleProcessEnvironment,
} from './trace-filter.ts';

const SPACE_ID = SpaceId.random();
const CONVERSATION = URI.make('eid:BA25QRC2FWNUGWENQZ26MK5W6C64ZQPTC:01J00000000000000000000000');

describe('processEnvironment', () => {
  test('an unscoped process is app-level', ({ expect }) => {
    expect(processEnvironment(makeInfo('layout', {}))).toBe(ProcessEnvironment.App);
  });

  test('a space-scoped process is space-level', ({ expect }) => {
    expect(processEnvironment(makeInfo('sync', { space: SPACE_ID }))).toBe(ProcessEnvironment.Space);
  });

  test('a conversation outranks its space', ({ expect }) => {
    expect(processEnvironment(makeInfo('agent', { space: SPACE_ID, conversation: CONVERSATION }))).toBe(
      ProcessEnvironment.Conversation,
    );
  });
});

describe('filterProcesses', () => {
  const processes = [
    makeInfo('layout', {}),
    makeInfo('sync', { space: SPACE_ID }),
    makeInfo('agent', { space: SPACE_ID, conversation: CONVERSATION }),
  ];

  test('keeps only the selected environments', ({ expect }) => {
    const visible = filterProcesses(processes, [ProcessEnvironment.Conversation]);
    expect(visible.map((process) => process.params.name)).toEqual(['agent']);
  });

  test('an empty selection hides everything', ({ expect }) => {
    expect(filterProcesses(processes, [])).toEqual([]);
  });

  test('selecting every environment passes the list through unchanged', ({ expect }) => {
    expect(filterProcesses(processes, ALL_PROCESS_ENVIRONMENTS)).toBe(processes);
  });

  test('the default selection hides app-level processes', ({ expect }) => {
    const visible = filterProcesses(processes, DEFAULT_PROCESS_ENVIRONMENTS);
    expect(visible.map((process) => process.params.name)).toEqual(['sync', 'agent']);
  });
});

describe('toggleProcessEnvironment', () => {
  test('adds in canonical order rather than at the end', ({ expect }) => {
    expect(toggleProcessEnvironment([ProcessEnvironment.Conversation], ProcessEnvironment.App)).toEqual([
      ProcessEnvironment.App,
      ProcessEnvironment.Conversation,
    ]);
  });

  test('removes a selected environment', ({ expect }) => {
    expect(
      toggleProcessEnvironment([ProcessEnvironment.App, ProcessEnvironment.Conversation], ProcessEnvironment.App),
    ).toEqual([ProcessEnvironment.Conversation]);
  });
});

describe('parseProcessEnvironments', () => {
  test('unset settings fall back to the default selection', ({ expect }) => {
    expect(parseProcessEnvironments(undefined)).toEqual(DEFAULT_PROCESS_ENVIRONMENTS);
  });

  test('an empty selection is preserved, not treated as unset', ({ expect }) => {
    expect(parseProcessEnvironments([])).toEqual([]);
  });

  test('drops values outside the vocabulary and restores canonical order', ({ expect }) => {
    expect(parseProcessEnvironments([ProcessEnvironment.Conversation, 'retired', ProcessEnvironment.App])).toEqual([
      ProcessEnvironment.App,
      ProcessEnvironment.Conversation,
    ]);
  });
});

const makeInfo = (name: string, environment: Process.Environment): Process.Info =>
  makeProcess({ pid: Process.ID.make(name), name, state: Process.State.RUNNING, environment });

describe('filterTraceMessages', () => {
  const message = (pid: string, parentPid?: string): Trace.Message =>
    Obj.make(Trace.Message, {
      meta: { pid, ...(parentPid ? { parentPid } : {}) },
      isEphemeral: false,
      events: [{ type: 'test', timestamp: 0, data: {} }],
    });

  test('an empty selection is no filter', ({ expect }) => {
    const messages = [message('a'), message('b')];
    expect(filterTraceMessages(messages, [])).toBe(messages);
  });

  test("a selected process keeps its own messages and its descendants'", ({ expect }) => {
    const messages = [message('agent'), message('tool', 'agent'), message('nested', 'tool'), message('other')];
    expect(filterTraceMessages(messages, ['agent']).map((m) => m.meta.pid)).toEqual(['agent', 'tool', 'nested']);
  });

  test('several selected processes are unioned', ({ expect }) => {
    const messages = [message('a'), message('b'), message('c')];
    expect(filterTraceMessages(messages, ['a', 'c']).map((m) => m.meta.pid)).toEqual(['a', 'c']);
  });

  test('a message with no pid is dropped once anything is selected', ({ expect }) => {
    const orphan = Obj.make(Trace.Message, { meta: {}, isEphemeral: false, events: [] });
    expect(filterTraceMessages([orphan, message('a')], ['a']).map((m) => m.meta.pid)).toEqual(['a']);
  });

  test('a cyclic parent chain terminates', ({ expect }) => {
    const messages = [message('a', 'b'), message('b', 'a')];
    expect(filterTraceMessages(messages, ['z'])).toEqual([]);
  });
});

describe('filterProcessesBySelection', () => {
  const process = (pid: string, parentPid?: string): Process.Info =>
    makeProcess({
      pid: Process.ID.make(pid),
      parentPid: parentPid === undefined ? null : Process.ID.make(parentPid),
      name: pid,
      state: Process.State.RUNNING,
    });

  test('an empty selection is no filter', ({ expect }) => {
    const processes = [process('a'), process('b')];
    expect(filterProcessesBySelection(processes, [])).toBe(processes);
  });

  test('a selected process keeps its descendants and drops the rest', ({ expect }) => {
    const processes = [process('agent'), process('tool', 'agent'), process('nested', 'tool'), process('other')];
    expect(filterProcessesBySelection(processes, ['agent']).map((info) => info.pid)).toEqual([
      'agent',
      'tool',
      'nested',
    ]);
  });

  test('a cyclic parent chain terminates', ({ expect }) => {
    const processes = [process('a', 'b'), process('b', 'a')];
    expect(filterProcessesBySelection(processes, ['z'])).toEqual([]);
  });
});
