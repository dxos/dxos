//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { composerTaskUrl, parseSession } from './session.ts';
import { delegatedTo, readTasks, sessionIds, syncTasks } from './tasks.ts';
import { SAMPLE_SESSION } from './testing/sample.ts';

const SPACE = 'BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA';
const SESSION = '01M7JTJA8EAJ689RCBWW7MXRW3';

describe('syncTasks', () => {
  test('adds a goal for a new task under ## Goals, and the board still parses', ({ expect }) => {
    const result = syncTasks(SAMPLE_SESSION, [
      { dxn: `echo://${SPACE}/01TASKA`, title: 'Fix: the board sync', status: 'started' },
    ]);
    expect(result.added).toEqual(['G-5']);
    const { board, errors } = parseSession(result.text);
    expect(errors).toEqual([]);
    expect(board?.goals.at(-1)).toMatchObject({
      id: 'G-5',
      title: 'Fix - the board sync',
      status: 'started',
      task: `echo://${SPACE}/01TASKA`,
    });
  });

  test('updates a linked goal in place and reports a missing one', ({ expect }) => {
    const first = syncTasks(SAMPLE_SESSION, [
      { dxn: `echo://${SPACE}/01TASKA`, title: 'A', status: 'todo' },
      { dxn: `echo://${SPACE}/01TASKB`, title: 'B', status: 'todo' },
    ]);
    // The local URI form names the same object as the qualified one.
    const second = syncTasks(first.text, [{ '@uri': 'echo:///01TASKA', 'status': 'review' }]);
    expect(second).toMatchObject({ added: [], updated: ['G-5'], missing: ['G-6'] });
    expect(parseSession(second.text).board?.goals.find(({ id }) => id === 'G-5')?.status).toBe('review');
    expect(syncTasks(second.text, [{ '@uri': 'echo:///01TASKA', 'status': 'review' }]).updated).toEqual([]);
  });

  test('links a goal to its task in Composer', ({ expect }) => {
    const { text } = syncTasks(SAMPLE_SESSION, [{ dxn: `echo://${SPACE}/01TASKA`, title: 'A' }]);
    expect(parseSession(text).board?.goals.at(-1)?.taskUrl).toBe(
      `https://composer.space/w/${SPACE}/db/org.dxos.type.task+01TASKA`,
    );
    // The local form names no space, so there is nothing to open.
    expect(composerTaskUrl('echo:///01TASKA')).toBeUndefined();
  });

  test('shortens a long title to 12 words', ({ expect }) => {
    const title = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    const { text } = syncTasks(SAMPLE_SESSION, [{ dxn: `echo://${SPACE}/01TASKC`, title }]);
    expect(parseSession(text).errors).toEqual([]);
  });

  test('rejects a task that is not an echo URI', ({ expect }) => {
    const text = syncTasks(SAMPLE_SESSION, [{ dxn: `echo://${SPACE}/01TASKA`, title: 'A' }]).text.replace(
      `task: echo://${SPACE}/01TASKA`,
      'task: 01TASKA',
    );
    expect(parseSession(text).errors.map(({ message }) => message)).toEqual([
      'G-5: task must be an echo: URI, as Composer returns it',
    ]);
  });
});

describe('delegatedTo', () => {
  test('keeps only tasks delegated to the session object', ({ expect }) => {
    const tasks = readTasks({
      tasks: [
        { '@uri': 'echo:///01A', 'delegate': { role: 'assistant', subject: { '/': `echo:///${SESSION}` } } },
        { '@uri': 'echo:///01B', 'delegate': { role: 'assistant', subject: { '/': 'echo:///01OTHER' } } },
        { '@uri': 'echo:///01C' },
      ],
    });
    expect(delegatedTo(tasks ?? [], `echo://${SPACE}/${SESSION}`).map((task) => task['@uri'])).toEqual(['echo:///01A']);
    expect(readTasks({ nothing: true })).toBeUndefined();
  });
});

describe('sessionIds', () => {
  test('maps the cloud id to the claude.ai form first', ({ expect }) => {
    expect(sessionIds({ CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_01ABC', CLAUDE_CODE_SESSION_ID: 'f0cdd2a1-uuid' })).toEqual(
      ['session_01ABC', 'f0cdd2a1-uuid'],
    );
    expect(sessionIds({})).toEqual([]);
  });
});
