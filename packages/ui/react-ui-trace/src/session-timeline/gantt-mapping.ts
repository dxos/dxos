//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Task } from '@dxos/types';
import { Unit } from '@dxos/util';

import {
  type GanttData,
  type GanttGroup,
  type GanttLane,
  type GanttMarker,
  type GanttMeta,
  type GanttSegment,
} from '../components/Gantt/index.ts';
import { type Lane, type SessionTimeline, type TokenUsage } from './types.ts';

/**
 * The one place the domain's nouns meet the chart's.
 *
 * The chart knows only groups, lanes, segments and markers; this file knows that a **process** is a
 * group — the band around the lanes of the tasks it works, with no row of its own — a **task** is a
 * lane inside it, a **subtask** nests under its parent task, and a **delegation** opens a lane out of
 * the node that spawned it. Keeping the translation here is what lets either vocabulary change without
 * dragging the other with it.
 */
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
 * A lane's stretch as segments: one run, split around each gap where its task was put down, so a
 * question and its answer are separate runs with the wait between them left open.
 */
const segmentsOf = (lane: Lane): GanttLane['segments'] => {
  if (lane.start === undefined) {
    return undefined;
  }
  const segments: GanttSegment[] = [];
  let start = lane.start;
  for (const gap of [...(lane.gaps ?? [])].sort((left, right) => left.start - right.start)) {
    // Clipped to the lane: a folded session lane keeps its own span while taking its task's gaps.
    const gapStart = Math.max(gap.start, start);
    const gapEnd = lane.end === undefined ? gap.end : Math.min(gap.end, lane.end);
    if (gapEnd <= gapStart) {
      continue;
    }
    if (gapStart > start) {
      segments.push({ start, end: gapStart });
    }
    start = gapEnd;
  }
  if (lane.end === undefined) {
    segments.push({ start });
  } else if (lane.end > start) {
    segments.push({ start, end: lane.end });
  }
  return segments;
};

const isHistoryEntry = Schema.is(Task.HistoryEntry);

/**
 * Maps a session timeline onto the chart's model.
 *
 * Every process becomes a band holding the lanes of the tasks it works; the process itself draws no
 * row, so its own nodes (requests, tool calls no task claims) are dropped. A process standing for one
 * task — a delegated sub-agent, or a session the builder folded its lone task into — is that task's
 * lane, so it keeps its span, its nodes and the node it opened out of. A process spawned by another
 * nests its band under its parent's — so causality is drawn by `openedFrom` while membership is
 * `groupId` and nesting is `parentId`, three facts the timeline's single `parentId` used to carry.
 */
export const sessionTimelineToGantt = (timeline: SessionTimeline): Pick<GanttData, 'groups' | 'lanes' | 'markers'> => {
  const byId = new Map(timeline.lanes.map((lane) => [lane.id, lane]));
  const groups: GanttGroup[] = [];
  const lanes: GanttLane[] = [];

  /** The band a lane belongs to: its own, for a process; its process's, for a task. */
  const bandOf = (lane: Lane): string | undefined => {
    if (lane.kind === 'session') {
      return lane.id;
    }
    const parent = lane.parentId === undefined ? undefined : byId.get(lane.parentId);
    return parent ? bandOf(parent) : undefined;
  };

  for (const lane of timeline.lanes) {
    const meta = laneMeta(lane);
    const facts = {
      label: lane.label,
      status: lane.status,
      ...(segmentsOf(lane) ? { segments: segmentsOf(lane) } : {}),
      ...(lane.delegatedFrom ? { openedFrom: lane.delegatedFrom } : {}),
      ...(lane.returnedTo ? { closedInto: lane.returnedTo } : {}),
      ...(lane.hue ? { hue: lane.hue } : {}),
      ...(lane.blockedOn ? { blockedOn: lane.blockedOn } : {}),
      ...(meta.length > 0 ? { meta } : {}),
    };
    const parent = lane.parentId === undefined ? undefined : byId.get(lane.parentId);

    if (lane.kind === 'session') {
      groups.push({
        id: lane.id,
        // A process spawned by another sits inside its parent's band; a task's parent resolves to the
        // process working it, which is the band this one nests under.
        ...(parent ? { parentId: bandOf(parent) } : {}),
      });
      if (lane.taskId === undefined) {
        continue;
      }
    }

    lanes.push({
      id: lane.id,
      groupId: bandOf(lane),
      // A task nests under its parent task; one hanging off its process sits at the top of the band.
      ...(lane.kind === 'task' && parent?.kind === 'task' ? { parentId: parent.id } : {}),
      ...facts,
    });
  }

  const drawn = new Set(lanes.map((lane) => lane.id));
  // A question waits for its answer: each answer node names the question it closes, by the question's
  // id in the task's history, so the pair is joined on the same lane.
  const answerByQuestion = new Map<string, string>();
  for (const marker of timeline.markers) {
    if (isHistoryEntry(marker.detail) && Task.isAnswerEntry(marker.detail)) {
      answerByQuestion.set(`${marker.laneId}:${marker.detail.questionId}`, marker.id);
    }
  }
  const markers: GanttMarker[] = timeline.markers
    .flatMap((marker) => (drawn.has(marker.laneId) ? [marker] : []))
    .map((marker) => {
      const question = isHistoryEntry(marker.detail) && Task.isQuestionEntry(marker.detail) ? marker.detail : undefined;
      const until = question && answerByQuestion.get(`${marker.laneId}:${question.id}`);
      return {
        id: marker.id,
        laneId: marker.laneId,
        kind: marker.kind,
        timestamp: marker.timestamp,
        label: marker.label,
        ...(marker.level ? { level: marker.level } : {}),
        ...(until ? { wait: { until } } : {}),
        ...(question && !until ? { pending: true } : {}),
      };
    });

  return { groups, lanes, markers };
};
