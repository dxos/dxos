//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import { SpaceId, URI } from '@dxos/keys';

import { makeProcess } from '#testing';

import {
  ALL_PROCESS_ENVIRONMENTS,
  DEFAULT_PROCESS_ENVIRONMENTS,
  ProcessEnvironment,
  filterProcesses,
  parseProcessEnvironments,
  processEnvironment,
  toggleProcessEnvironment,
} from './trace-filter';

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
