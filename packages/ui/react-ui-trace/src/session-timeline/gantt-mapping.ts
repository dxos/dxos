//
// Copyright 2026 DXOS.org
//

import { Unit } from '@dxos/util';

import {
  type GanttData,
  type GanttGroup,
  type GanttLane,
  type GanttMarker,
  type GanttMeta,
} from '../components/Gantt/index.ts';
import { type Lane, type SessionTimeline, type TokenUsage } from './types.ts';

/**
 * The one place the domain's nouns meet the chart's.
 *
 * The chart knows only groups, lanes, segments and markers; this file knows that a **process** is a
 * group (plus a lane for its own activity), a **task** is a lane inside it, a **subtask** nests under
 * its parent task, and a **delegation** opens a lane out of the node that spawned it. Keeping the
 * translation here is what lets either vocabulary change without dragging the other with it.
 */
const groupId = (sessionLaneId: string): string => `group:${sessionLaneId}`;

const formatTokens = (tokens: TokenUsage): string =>
  tokens.total >= 1_000 ? Unit.Thousand(tokens.total).toString() : String(tokens.total);

/** Tokens and tool calls, formatted here because the chart renders `meta` without reading it. */
const laneMeta = (lane: Lane): GanttMeta[] => [
  ...(lane.tokens
    ? [{ label: formatTokens(lane.tokens), title: `${lane.tokens.input} in / ${lane.tokens.output} out` }]
    : []),
  ...(lane.toolCalls !== undefined ? [{ label: `${lane.toolCalls} tools` }] : []),
];

/**
 * A process lane's stretch, as one segment. The builder records a single interval per lane; when it
 * learns to emit the stretches it already computes internally, only this line changes.
 */
const segmentsOf = (lane: Lane): GanttLane['segments'] =>
  lane.start === undefined ? undefined : [{ start: lane.start, ...(lane.end === undefined ? {} : { end: lane.end }) }];

/**
 * Maps a session timeline onto the chart's model.
 *
 * Every process becomes a band holding its own lane and the lanes of the tasks it works. A process
 * spawned by another nests its band under its parent's, and its own lane opens out of the exact node
 * that spawned it — so causality is drawn by `openedFrom` while membership is `groupId` and nesting
 * is `parentId`, three facts the timeline's single `parentId` used to carry at once.
 */
export const sessionTimelineToGantt = (timeline: SessionTimeline): Pick<GanttData, 'groups' | 'lanes' | 'markers'> => {
  const byId = new Map(timeline.lanes.map((lane) => [lane.id, lane]));
  const groups: GanttGroup[] = [];
  const lanes: GanttLane[] = [];

  /** The band a lane belongs to: its own, for a process; its process's, for a task. */
  const bandOf = (lane: Lane): string | undefined => {
    if (lane.kind === 'session') {
      return groupId(lane.id);
    }
    const parent = lane.parentId === undefined ? undefined : byId.get(lane.parentId);
    return parent ? bandOf(parent) : undefined;
  };

  for (const lane of timeline.lanes) {
    if (lane.kind === 'session') {
      const parent = lane.parentId === undefined ? undefined : byId.get(lane.parentId);
      groups.push({
        id: groupId(lane.id),
        // A process spawned by another sits inside its parent's band; a task's parent resolves to the
        // process working it, which is the band this one nests under.
        ...(parent ? { parentId: bandOf(parent) } : {}),
      });
    }

    const meta = laneMeta(lane);
    // A task nests under its parent task; a process's own lane never nests, because its band already
    // says where it sits.
    const parent = lane.parentId === undefined ? undefined : byId.get(lane.parentId);
    lanes.push({
      id: lane.id,
      label: lane.label,
      status: lane.status,
      groupId: bandOf(lane),
      ...(lane.kind === 'task' && parent?.kind === 'task' ? { parentId: parent.id } : {}),
      ...(segmentsOf(lane) ? { segments: segmentsOf(lane) } : {}),
      ...(lane.delegatedFrom ? { openedFrom: lane.delegatedFrom } : {}),
      ...(lane.returnedTo ? { closedInto: lane.returnedTo } : {}),
      ...(lane.blockedOn ? { blockedOn: lane.blockedOn } : {}),
      ...(meta.length > 0 ? { meta } : {}),
    });
  }

  const markers: GanttMarker[] = timeline.markers.map((marker) => ({
    id: marker.id,
    laneId: marker.laneId,
    kind: marker.kind,
    timestamp: marker.timestamp,
    label: marker.label,
    ...(marker.level ? { level: marker.level } : {}),
  }));

  return { groups, lanes, markers };
};
