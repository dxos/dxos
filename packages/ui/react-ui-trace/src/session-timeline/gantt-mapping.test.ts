//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

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
});
