//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Task } from '@dxos/types';

import { sessionTimelineToGantt } from './gantt-mapping.ts';
import { type SessionTimeline } from './types.ts';

describe('sessionTimelineToGantt', () => {
  test('a session is the band around its tasks, with no row of its own', ({ expect }) => {
    const timeline: SessionTimeline = {
      lanes: [
        { id: 'session:a', kind: 'session', label: 'Chat', status: 'running', start: 1, toolCalls: 2 },
        { id: 'task:1', kind: 'task', label: 'Parent', status: 'running', start: 2, parentId: 'session:a' },
        { id: 'task:2', kind: 'task', label: 'Child', status: 'done', start: 3, end: 4, parentId: 'task:1' },
      ],
      markers: [{ id: 'm', laneId: 'session:a', kind: 'request', timestamp: 1, label: 'Request started' }],
      range: { start: 1, end: 4 },
    };

    const { groups, lanes, markers } = sessionTimelineToGantt(timeline);
    // The session is the band alone: no row doubles it, and its own nodes have nowhere to go.
    expect(groups).toEqual([{ id: 'session:a' }]);
    expect(lanes.map(({ id, groupId, parentId }) => ({ id, groupId, parentId }))).toEqual([
      { id: 'task:1', groupId: 'session:a', parentId: undefined },
      { id: 'task:2', groupId: 'session:a', parentId: 'task:1' },
    ]);
    expect(markers).toEqual([]);
  });

  test('a session standing for one task is that task, drawn inside its own band', ({ expect }) => {
    const timeline: SessionTimeline = {
      lanes: [{ id: 'session:a', kind: 'session', label: 'Only', status: 'running', start: 1, taskId: 't' }],
      markers: [{ id: 'm', laneId: 'session:a', kind: 'task', timestamp: 1, label: 'Task started' }],
      range: { start: 1, end: 1 },
    };

    const { groups, lanes, markers } = sessionTimelineToGantt(timeline);
    expect(groups).toEqual([{ id: 'session:a' }]);
    expect(lanes).toMatchObject([{ id: 'session:a', groupId: 'session:a', label: 'Only' }]);
    expect(markers?.map(({ laneId }) => laneId)).toEqual(['session:a']);
  });

  test('a lane breaks around each gap, so a question and its answer are separate runs', ({ expect }) => {
    const timeline: SessionTimeline = {
      lanes: [
        { id: 'session:a', kind: 'session', label: 'Chat', status: 'running', start: 1 },
        {
          id: 'task:1',
          kind: 'task',
          label: 'Cup',
          status: 'done',
          start: 2,
          end: 9,
          gaps: [{ start: 4, end: 6 }],
          parentId: 'session:a',
        },
        { id: 'task:2', kind: 'task', label: 'Open', status: 'running', start: 2, parentId: 'session:a' },
      ],
      markers: [],
      range: { start: 1, end: 9 },
    };

    const { lanes } = sessionTimelineToGantt(timeline);
    expect(lanes.map(({ segments }) => segments)).toEqual([
      [
        { start: 2, end: 4 },
        { start: 6, end: 9 },
      ],
      [{ start: 2 }],
    ]);
  });

  test('an answered question waits until its answer; an open one has no wait yet', ({ expect }) => {
    const task = Task.make({ title: 'Cup', status: 'blocked' });
    const asked = Task.ask(task, { text: 'Which lot?' });
    const open = Task.ask(task, { text: 'Which roast?' });
    const answered = Task.answer(task, asked.id, 'Guji');
    const timeline: SessionTimeline = {
      lanes: [
        { id: 'session:a', kind: 'session', label: 'Chat', status: 'running', start: 1 },
        { id: 'task:1', kind: 'task', label: 'Cup', status: 'blocked', start: 2, parentId: 'session:a' },
      ],
      markers: [
        { id: 'q1', laneId: 'task:1', kind: 'task', timestamp: 3, label: 'Which lot?', level: 'warn', detail: asked },
        { id: 'q2', laneId: 'task:1', kind: 'task', timestamp: 4, label: 'Which roast?', level: 'warn', detail: open },
        { id: 'a1', laneId: 'task:1', kind: 'task', timestamp: 5, label: 'Answered: Guji', detail: answered },
      ],
      range: { start: 1, end: 5 },
    };

    const byId = new Map((sessionTimelineToGantt(timeline).markers ?? []).map((marker) => [marker.id, marker]));
    expect(byId.get('q1')?.wait).toEqual({ until: 'a1' });
    expect(byId.get('q2')?.wait).toBeUndefined();
    // The open one is pending until answered; the answered one is not.
    expect(byId.get('q2')?.pending).toBe(true);
    expect(byId.get('q1')?.pending).toBeUndefined();
    expect(byId.get('a1')?.wait).toBeUndefined();
  });
});
