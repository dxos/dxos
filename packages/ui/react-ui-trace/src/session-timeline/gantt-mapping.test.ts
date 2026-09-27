//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { sessionTimelineToGantt } from './gantt-mapping.ts';
import { type SessionTimeline } from './types.ts';

describe('sessionTimelineToGantt', () => {
  test('a session is the header of its band, under its own id, and its tasks sit inside it', ({ expect }) => {
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
    expect(groups).toEqual([
      {
        id: 'session:a',
        header: { label: 'Chat', status: 'running', segments: [{ start: 1 }], meta: [{ label: '2 tools' }] },
      },
    ]);
    // No lane doubles the session; its markers address the group, whose header row draws them.
    expect(lanes.map(({ id, groupId, parentId }) => ({ id, groupId, parentId }))).toEqual([
      { id: 'task:1', groupId: 'session:a', parentId: undefined },
      { id: 'task:2', groupId: 'session:a', parentId: 'task:1' },
    ]);
    expect(markers[0].laneId).toBe('session:a');
  });
});
