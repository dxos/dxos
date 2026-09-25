//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Annotation } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Task } from '@dxos/types';

import { type Span, buildSpanTree, flattenSpanTree } from '../execution-graph/index.ts';
import {
  type Lane,
  type LaneStatus,
  type Marker,
  type Session,
  type SessionTimeline,
  type TokenUsage,
} from './types.ts';

export interface BuildSessionTimelineInput {
  traceMessages: readonly Trace.Message[];
  processes?: readonly Process.Info[];
  /** The sessions to draw; each contributes a lane and its checklist's task lanes. */
  sessions?: readonly Session[];
  tasks?: readonly Task.Task[];
  /** Reference time; extends the range past open lanes. */
  now?: number;
}

const ACTIVE_STATES = new Set<Process.State>([Process.State.RUNNING, Process.State.HYBERNATING]);

/** How long an open lane may be silent before the axis stops following `now`. */
const OPEN_LANE_STALE_MS = 10 * 60_000;

/** How far apart a task's history entry and the trace event recording the same transition may land. */
const HISTORY_MATCH_MS = 5_000;

const TASK_STATUS: Partial<Record<Task.Status, LaneStatus>> = {
  todo: 'pending',
  backlog: 'pending',
  blocked: 'blocked',
  started: 'running',
  review: 'review',
  done: 'done',
  failed: 'failed',
};

/** Entity id of an ECHO URI, the join key between a process target, a trace meta and a chat. */
const entityKey = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

const eventFeedKey = (event: Trace.FlatEvent): string | undefined =>
  event.meta.conversation ? entityKey(event.meta.conversation.uri) : undefined;

const decode = <S extends Schema.ConstraintDecoder<unknown>>(schema: S, data: unknown): S['Type'] | undefined =>
  Option.getOrUndefined(Schema.decodeUnknownOption(schema)(data));

type MutableLane = { -readonly [K in keyof Lane]: Lane[K] };

const sessionLaneId = (key: string): string => `session:${key}`;
const taskLaneId = (taskId: string): string => `task:${taskId}`;

interface SessionSource {
  key: string;
  label: string;
  session?: Session;
  pids: Set<string>;
}

/**
 * The stretch of a session during which one task was the active one, bounded by the status events
 * the planning tool writes. Everything the session did inside it belongs to that task.
 */
interface TaskSegment {
  taskId: string;
  laneId: string;
  start: number;
  end?: number;
}

/**
 * Cuts a session's events into one segment per task worked, from the status events its task tools
 * write. Only tasks in `taskIds` — the session's own checklist — take part: an agent is free to move
 * a task belonging to nothing on this chart, and such an event must not close the segment that is
 * open or move the boundary.
 *
 * A `started` event opens a segment and closes the one still open — the agent keeps exactly one task
 * in progress. Any other status ends the agent's work on the task: `todo` puts it down as surely as
 * `done`, and whatever the agent does next is no longer that task's. A task can also finish without
 * a start: delegation marks every task it hands over
 * `started` before the agent's first turn, so the run's only event for that task is the one closing
 * it. Such a task gets the stretch since the last boundary, which is where its work happened — but
 * only on the transition out of `started` and only while no other task holds the stretch: a task
 * merely dismissed (`todo` → `blocked`) claims nothing, a second close (`review` → `done`) mints
 * nothing, and a close arriving after the next task has started leaves that task's segment alone
 * rather than overlapping it.
 */
const buildTaskSegments = (
  events: readonly Trace.FlatEvent[],
  sessionStart: number | undefined,
  taskIds: ReadonlySet<string>,
): TaskSegment[] => {
  const segments: TaskSegment[] = [];
  let open: TaskSegment | undefined;
  let boundary = sessionStart;
  const close = (segment: TaskSegment, timestamp: number): void => {
    segment.end = timestamp;
    boundary = timestamp;
    if (open === segment) {
      open = undefined;
    }
  };

  for (const event of events) {
    if (event.type !== Trace.TaskStatusChanged.key) {
      continue;
    }
    const data = decode(Trace.TaskStatusChanged.schema, event.data);
    if (!data || !taskIds.has(data.taskId)) {
      continue;
    }
    if (data.status === 'started') {
      if (open && open.taskId !== data.taskId) {
        close(open, event.timestamp);
      }
      if (!open) {
        open = { taskId: data.taskId, laneId: taskLaneId(data.taskId), start: event.timestamp };
        segments.push(open);
        boundary = event.timestamp;
      }
    } else {
      const started = segments.findLast((candidate) => candidate.taskId === data.taskId && candidate.end === undefined);
      if (started) {
        close(started, event.timestamp);
      } else if (data.previousStatus === 'started' && open === undefined) {
        const segment = {
          taskId: data.taskId,
          laneId: taskLaneId(data.taskId),
          start: Math.min(boundary ?? event.timestamp, event.timestamp),
        };
        segments.push(segment);
        close(segment, event.timestamp);
      }
    }
  }
  return segments;
};

/**
 * The segment an event belongs to. Segments meet where one task starts over another, so a
 * status event is matched to its own task's segment, and any other event at a shared boundary
 * goes to the later segment — the newcomer's start is the first thing the agent did on it.
 */
const segmentFor = (segments: readonly TaskSegment[] | undefined, event: Trace.FlatEvent): TaskSegment | undefined => {
  if (!segments) {
    return undefined;
  }
  const contains = (segment: TaskSegment) =>
    event.timestamp >= segment.start && event.timestamp <= (segment.end ?? Number.MAX_SAFE_INTEGER);
  if (event.type === Trace.TaskStatusChanged.key) {
    const data = decode(Trace.TaskStatusChanged.schema, event.data);
    return data && segments.findLast((segment) => segment.taskId === data.taskId && contains(segment));
  }
  return segments.findLast(contains);
};

/**
 * The stretch a task's own log says it was worked: from its first move to `started` to the last move
 * out of it. `end` is absent while the log leaves it `started`; `last` is the log's last transition.
 * Absent when the task was never started.
 */
const historySpan = (
  changes: readonly Task.StatusChange[],
): { start: number; end?: number; last: number } | undefined => {
  let start: number | undefined;
  let end: number | undefined;
  let open = false;
  for (const change of changes) {
    if (change.status === 'started') {
      start ??= change.timestamp;
      open = true;
    } else if (open) {
      end = change.timestamp;
      open = false;
    }
  }
  const last = changes.at(-1)?.timestamp;
  return start === undefined || last === undefined ? undefined : { start, end: open ? undefined : end, last };
};

const historyMarker = (
  entry: Task.HistoryEntry,
  change: Task.StatusChange | undefined,
  id: string,
  laneId: string,
  pid: string | undefined,
): Marker | undefined => {
  const timestamp = change?.timestamp ?? Date.parse(entry.date);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  const base = { id, laneId, kind: 'task' as const, timestamp, pid, detail: entry };
  switch (entry.event) {
    case 'question':
      return { ...base, label: entry.text, level: 'warn' };
    case 'answer':
      return { ...base, label: `Answered: ${entry.answer}` };
    default:
      return {
        ...base,
        label: entry.description ?? `Task ${change?.status ?? entry.event}`,
        level: change?.status === 'failed' ? 'error' : undefined,
      };
  }
};

interface SubAgentSpan {
  span: Span;
  pid: string;
  startEvent: Trace.FlatEvent;
}

/**
 * Builds the gantt-shaped view of one or more assistant sessions from their trace: session lanes
 * (supervisors and the sub-agents they delegate to), task lanes, and the markers on each.
 */
export const buildSessionTimeline = ({
  traceMessages,
  processes = [],
  sessions,
  tasks = [],
  now,
}: BuildSessionTimelineInput): SessionTimeline => {
  const root = buildSpanTree(traceMessages);
  const spans = flattenSpanTree(root);
  const events = spans.flatMap((span) => span.events).sort((a, b) => a.timestamp - b.timestamp);
  const requestBegins = events.filter(
    (event): event is Trace.FlatEvent & { meta: { pid: string } } =>
      event.type === Trace.AgentRequestBegin.key && event.meta.pid !== undefined,
  );

  // The agent process targets the chat; its trace meta carries the chat's feed.
  const agentPidsByChat = new Map<string, string[]>();
  for (const process of processes) {
    if (!Process.isHarnessHost(process)) {
      continue;
    }
    const target = Option.getOrUndefined(
      Annotation.getDictionary(process.params.annotations, Process.TargetAnnotation),
    );
    if (target !== undefined) {
      const key = entityKey(target.toString());
      agentPidsByChat.set(key, [...(agentPidsByChat.get(key) ?? []), process.pid]);
    }
  }

  const sources: SessionSource[] = [];
  if (sessions) {
    for (const session of sessions) {
      if (session.taskIds.length === 0) {
        continue;
      }
      const feed = session.feedId;
      const pids = new Set<string>(agentPidsByChat.get(entityKey(session.uri)) ?? []);
      for (const event of requestBegins) {
        if (feed !== undefined && eventFeedKey(event) === feed) {
          pids.add(event.meta.pid);
        }
      }
      // A feed or object id is not a name: an unnamed chat reads as the session it is until the
      // naming turn lands.
      sources.push({ key: session.id, label: session.label?.trim() || 'Session', session, pids });
    }
  } else {
    // Without chats, the conversation feed groups a session's pids; a trace with no conversation
    // meta falls back to one session per agent pid.
    const byKey = new Map<string, SessionSource>();
    for (const event of requestBegins) {
      const pid = event.meta.pid;
      const key = eventFeedKey(event) ?? pid;
      const source = byKey.get(key) ?? {
        key,
        label: eventFeedKey(event) ?? event.meta.processName ?? pid,
        pids: new Set<string>(),
      };
      source.pids.add(pid);
      byKey.set(key, source);
    }
    sources.push(...byKey.values());
  }

  const processByPid = new Map<string, Process.Info>(processes.map((process) => [process.pid, process]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const laneByPid = new Map<string, string>();
  const lanes: MutableLane[] = [];
  const markers: Marker[] = [];
  const childSessions: { lane: MutableLane; sessionLaneId: string }[] = [];
  const replacedTaskLanes = new Map<string, string>();
  /** Per session lane: the task segments its markers are attributed to. */
  const segmentsBySession = new Map<string, TaskSegment[]>();

  for (const source of sources) {
    const laneId = sessionLaneId(source.key);
    const sessionEvents = events.filter((event) => event.meta.pid && source.pids.has(event.meta.pid));
    const begins = sessionEvents.filter((event) => event.type === Trace.AgentRequestBegin.key);
    const ends = sessionEvents.filter((event) => event.type === Trace.AgentRequestEnd.key);
    const requestOpen = begins.length > ends.length;
    const processActive = [...source.pids].some((pid) => {
      const process = processByPid.get(pid);
      return process !== undefined && ACTIVE_STATES.has(process.state);
    });
    const lastEnd = ends.at(-1);
    const lastEndStatus = lastEnd ? decode(Trace.AgentRequestEnd.schema, lastEnd.data)?.status : undefined;
    // An unmatched request begin is a run in flight only while its process is; with the process
    // recorded as ended, the run died before writing its end, so the lane closes at its last event
    // rather than staying open (and stretching the chart) indefinitely.
    const processKnown = [...source.pids].some((pid) => processByPid.has(pid));
    const died = requestOpen && processKnown && !processActive;
    const open = requestOpen && !died;
    const status: LaneStatus =
      processActive || open ? 'running' : died || lastEndStatus === 'error' ? 'failed' : 'done';

    lanes.push({
      id: laneId,
      kind: 'session',
      label: source.label,
      status,
      start: begins[0]?.timestamp,
      end: open ? undefined : died ? sessionEvents.at(-1)?.timestamp : lastEnd?.timestamp,
      sessionId: source.session?.id,
      pid: [...source.pids].at(-1),
    });
    for (const pid of source.pids) {
      laneByPid.set(pid, laneId);
    }

    // The spawn event is the only durable pid ↔ task pairing; a sub-agent's own trace carries
    // neither the task nor the conversation.
    const taskByPid = new Map<string, string>();
    for (const event of sessionEvents) {
      if (event.type === Trace.DelegationSpawned.key) {
        const data = decode(Trace.DelegationSpawned.schema, event.data);
        if (data) {
          taskByPid.set(data.pid, data.taskId);
        }
      }
    }

    // A child span is a sub-agent (not a tool call) when it was spawned as one or emits its own
    // content blocks.
    const subAgentSpans: SubAgentSpan[] = spans.flatMap((span) => {
      const startEvent = span.events[0];
      const pid = span.meta.pid;
      if (
        pid === undefined ||
        span.meta.parentPid === undefined ||
        !source.pids.has(span.meta.parentPid) ||
        startEvent?.type !== Trace.OperationStart.key
      ) {
        return [];
      }
      const isAgent = taskByPid.has(pid) || span.events.some((event) => event.type === Trace.CompleteBlock.key);
      return isAgent ? [{ span, pid, startEvent }] : [];
    });

    const chatTasks = (source.session?.taskIds ?? [])
      .map((id) => taskById.get(id))
      .filter((task): task is Task.Task => task !== undefined);
    // Only a dependency on the checklist gets a lane, so `blockedOn` never names a lane that is
    // not drawn.
    const chatTaskIds = new Set(chatTasks.map((task) => task.id));
    const taskLanes = new Map<string, MutableLane>();
    for (const task of chatTasks) {
      const taskLane: MutableLane = {
        id: taskLaneId(task.id),
        kind: 'task',
        label: task.title,
        status: taskLaneStatus(task, tasks),
        parentId: laneId,
        sessionId: source.session?.id,
        taskId: task.id,
      };
      const blockedOn = (task.dependsOn ?? [])
        .map((ref) => Task.refEntityId(ref))
        .filter((id): id is string => id !== undefined && chatTaskIds.has(id))
        .map(taskLaneId);
      if (blockedOn.length > 0) {
        taskLane.blockedOn = blockedOn;
      }
      taskLanes.set(task.id, taskLane);
      lanes.push(taskLane);
    }

    // Spawned pids without a trace yet still get a lane from their process.
    const subAgentPids = new Set<string>([...subAgentSpans.map(({ pid }) => pid), ...taskByPid.keys()]);

    // The status events bound each task's stretch of the session, giving its lane a span of its own
    // and a node where it started and finished. A status tool runs as a child process of the agent,
    // so its events carry their own pid and reach the session through `parentPid`; a spawned
    // sub-agent's do too, and those belong to its own lane rather than cutting this one.
    const ownEvents = events.filter(
      (event) =>
        (event.meta.pid !== undefined && source.pids.has(event.meta.pid)) ||
        (event.meta.parentPid !== undefined &&
          source.pids.has(event.meta.parentPid) &&
          !(event.meta.pid !== undefined && subAgentPids.has(event.meta.pid))),
    );
    const segments = buildTaskSegments(ownEvents, begins[0]?.timestamp, chatTaskIds);
    segmentsBySession.set(laneId, segments);
    for (const segment of segments) {
      const taskLane = taskLanes.get(segment.taskId);
      if (!taskLane) {
        continue;
      }
      taskLane.start = Math.min(taskLane.start ?? segment.start, segment.start);
      // An open segment leaves the lane open, even if an earlier one closed.
      taskLane.end = segment.end === undefined ? undefined : Math.max(taskLane.end ?? segment.end, segment.end);
    }

    // The task's own log bounds its lane too, so a task worked where the trace does not reach (another
    // device, a pruned feed, a person's edit) still gets a span. The lane stays open only while the task
    // itself is `started`: a log missing its closing transition must not reopen finished work.
    for (const task of chatTasks) {
      const taskLane = taskLanes.get(task.id);
      const span = historySpan(Task.getStatusChanges(task.history));
      if (!taskLane || !span) {
        continue;
      }
      const tracedEnd = taskLane.start === undefined ? undefined : taskLane.end;
      taskLane.start = Math.min(taskLane.start ?? span.start, span.start);
      if (span.end === undefined && task.status === 'started') {
        taskLane.end = undefined;
      } else {
        const end = span.end ?? tracedEnd ?? span.last;
        taskLane.end = tracedEnd === undefined ? end : Math.max(tracedEnd, end);
      }
    }

    for (const subPid of subAgentPids) {
      const match = subAgentSpans.find((candidate) => candidate.pid === subPid);
      const process = processByPid.get(subPid);
      if (!match && !process) {
        continue;
      }
      const taskId = taskByPid.get(subPid);
      const task = taskId === undefined ? undefined : taskById.get(taskId);
      const startName = match ? decode(Trace.OperationStart.schema, match.startEvent.data)?.name : undefined;
      const endEvent = match?.span.events.find((event) => event.type === Trace.OperationEnd.key);
      const start = match?.startEvent.timestamp ?? process?.startedAt;
      const end = endEvent?.timestamp ?? (process ? Option.getOrUndefined(process.completedAt) : undefined);
      const subLane: MutableLane = {
        id: sessionLaneId(subPid),
        kind: 'session',
        label: task?.title ?? startName ?? process?.params.name ?? subPid,
        status: subSessionStatus(endEvent, process),
        start,
        end,
        parentId: laneId,
        sessionId: source.session?.id,
        taskId,
        pid: subPid,
      };
      laneByPid.set(subPid, subLane.id);
      childSessions.push({ lane: subLane, sessionLaneId: laneId });
      // A delegated task IS its child session: the session lane takes the task lane's place and
      // its dependencies, so a task is either worked in-session (a task lane) or spawned (a session).
      const taskLane = taskId === undefined ? undefined : taskLanes.get(taskId);
      if (taskLane) {
        subLane.blockedOn = taskLane.blockedOn;
        lanes.splice(lanes.indexOf(taskLane), 1, subLane);
        replacedTaskLanes.set(taskLane.id, subLane.id);
      } else {
        lanes.push(subLane);
      }
    }
  }

  // A delegated task IS its child session, drawn with the child's own span; the parent's markers in
  // that stretch are the parent's work of handing it over, so the segment goes rather than moving.
  for (const [sessionId, segments] of segmentsBySession) {
    segmentsBySession.set(
      sessionId,
      segments.filter((segment) => !replacedTaskLanes.has(segment.laneId)),
    );
  }

  // Each entry in a task's log is a node on its lane. A status change the trace also recorded is drawn
  // once, from the entry, which says everything the edit changed; the trace event lends it the pid and
  // is not drawn. Only a trace event on a drawn lane is matched, so none is hidden that had a node.
  const tracedChanges = new Map<string, Trace.FlatEvent[]>();
  for (const event of events) {
    const drawn =
      (event.meta.pid !== undefined && laneByPid.has(event.meta.pid)) ||
      (event.meta.parentPid !== undefined && laneByPid.has(event.meta.parentPid));
    if (drawn && event.type === Trace.TaskStatusChanged.key) {
      const data = decode(Trace.TaskStatusChanged.schema, event.data);
      if (data) {
        tracedChanges.set(data.taskId, [...(tracedChanges.get(data.taskId) ?? []), event]);
      }
    }
  }
  const mergedEvents = new Set<Trace.FlatEvent>();
  // A delegated task's lane is its child session, which carries the task id, so it gets the nodes too.
  for (const lane of lanes) {
    const task = lane.taskId === undefined ? undefined : taskById.get(lane.taskId);
    if (!task) {
      continue;
    }
    const traced = tracedChanges.get(task.id) ?? [];
    for (const entry of task.history ?? []) {
      const change = Task.getStatusChange(entry);
      const match =
        change &&
        traced.find(
          (event) =>
            !mergedEvents.has(event) &&
            decode(Trace.TaskStatusChanged.schema, event.data)?.status === change.status &&
            Math.abs(event.timestamp - change.timestamp) <= HISTORY_MATCH_MS,
        );
      if (match) {
        mergedEvents.add(match);
      }
      const marker = historyMarker(entry, change, `${lane.id}:${markers.length}`, lane.id, match?.meta.pid);
      if (marker) {
        markers.push(marker);
      }
    }
  }

  // Dependencies named the task lane; they follow it to the session that replaced it.
  for (const lane of lanes) {
    if (lane.blockedOn) {
      lane.blockedOn = lane.blockedOn.map((id) => replacedTaskLanes.get(id) ?? id);
    }
  }

  // Markers and token totals, attributed to the lane owning the event's pid or its parent pid.
  const tokens = new Map<string, { usage: TokenUsage; toolCalls: number }>();
  const spawnMarkerByPid = new Map<string, string>();
  for (const event of events) {
    const laneId =
      (event.meta.pid && laneByPid.get(event.meta.pid)) ??
      (event.meta.parentPid && laneByPid.get(event.meta.parentPid)) ??
      undefined;
    if (laneId === undefined) {
      continue;
    }
    // Everything the session did while a task was active is that task's, so the session bar keeps
    // only what brackets the whole run (its request markers) and the timeline reads per task.
    const markerLaneId =
      event.type === Trace.AgentRequestBegin.key || event.type === Trace.AgentRequestEnd.key
        ? laneId
        : (segmentFor(segmentsBySession.get(laneId), event)?.laneId ?? laneId);
    const marker = mergedEvents.has(event)
      ? undefined
      : toMarker(event, `${markerLaneId}:${markers.length}`, markerLaneId);
    if (marker) {
      markers.push(marker);
      if (marker.kind === 'delegation') {
        const data = decode(Trace.DelegationSpawned.schema, event.data);
        if (data) {
          spawnMarkerByPid.set(data.pid, marker.id);
        }
      }
    }
    if (event.type === Trace.CompleteBlock.key) {
      const data = decode(Trace.CompleteBlock.schema, event.data);
      if (data?.block._tag === 'stats') {
        const entry = tokens.get(laneId) ?? { usage: { input: 0, output: 0, total: 0 }, toolCalls: 0 };
        // A provider that reports no total still reports the parts.
        const input = data.block.usage?.inputTokens ?? 0;
        const output = data.block.usage?.outputTokens ?? 0;
        const total = data.block.usage?.totalTokens ?? input + output;
        entry.usage = {
          input: entry.usage.input + input,
          output: entry.usage.output + output,
          total: entry.usage.total + total,
        };
        entry.toolCalls += data.block.toolCalls ?? 0;
        tokens.set(laneId, entry);
      }
    }
  }
  for (const lane of lanes) {
    const entry = tokens.get(lane.id);
    if (entry) {
      lane.tokens = entry.usage;
      lane.toolCalls = entry.toolCalls;
    }
  }

  // The connector starts at the spawn marker, else at the supervisor's last node before the child began.
  for (const { lane, sessionLaneId } of childSessions) {
    const markerId =
      (lane.pid && spawnMarkerByPid.get(lane.pid)) ??
      markers.filter((marker) => marker.laneId === sessionLaneId && marker.timestamp <= (lane.start ?? 0)).at(-1)?.id;
    if (markerId !== undefined) {
      lane.delegatedFrom = { laneId: sessionLaneId, markerId };
    }
  }

  // A session working exactly one task is that task: the two lanes would carry the same label,
  // so the task lane folds into the session's (which keeps its run span and totals, and takes the
  // task's id and status so it still reads as the work). Only a lone in-session task, with nothing
  // depending on it and no spawned child, folds — a checklist of several stays a tree.
  for (const session of lanes.filter((lane) => lane.kind === 'session' && lane.parentId === undefined)) {
    const children = lanes.filter((lane) => lane.parentId === session.id);
    const [task] = children;
    if (children.length !== 1 || task.kind !== 'task' || lanes.some((lane) => lane.blockedOn?.includes(task.id))) {
      continue;
    }
    lanes.splice(lanes.indexOf(task), 1);
    session.taskId = task.taskId;
    if (task.status === 'blocked' || task.status === 'review' || task.status === 'pending') {
      session.status = task.status;
    }
    markers.forEach((marker, index) => {
      if (marker.laneId === task.id) {
        markers[index] = { ...marker, laneId: session.id };
      }
    });
  }

  const times = [
    ...lanes.flatMap((lane) => [lane.start, lane.end]).filter((time): time is number => time !== undefined),
    ...markers.map((marker) => marker.timestamp),
  ];
  // The axis reaches `now` for a run still in flight; one whose last event is long past is idle or
  // dead whatever its status says, and stretching the axis to now would bunch its nodes into a sliver.
  const hasOpen = lanes.some((lane) => lane.start !== undefined && lane.end === undefined);
  const latest = times.length > 0 ? Math.max(...times) : undefined;
  if (hasOpen && now !== undefined && (latest === undefined || now - latest <= OPEN_LANE_STALE_MS)) {
    times.push(now);
  }
  const start = times.length > 0 ? Math.min(...times) : (now ?? 0);
  const end = times.length > 0 ? Math.max(...times) : start;

  return { lanes, markers, range: { start, end } };
};

const taskLaneStatus = (task: Task.Task, tasks: readonly Task.Task[]): LaneStatus => {
  if (task.status === 'todo' && !Task.isTaskReady(tasks, task)) {
    return 'blocked';
  }
  return (task.status && TASK_STATUS[task.status]) ?? 'pending';
};

const subSessionStatus = (endEvent: Trace.FlatEvent | undefined, process: Process.Info | undefined): LaneStatus => {
  if (endEvent) {
    return decode(Trace.OperationEnd.schema, endEvent.data)?.outcome === 'failure' ? 'failed' : 'done';
  }
  if (process && !ACTIVE_STATES.has(process.state)) {
    return process.state === Process.State.FAILED ? 'failed' : 'done';
  }
  return 'running';
};

const toMarker = (event: Trace.FlatEvent, id: string, laneId: string): Marker | undefined => {
  const base = { id, laneId, timestamp: event.timestamp, pid: event.meta.pid };
  switch (event.type) {
    case Trace.AgentRequestBegin.key:
      return { ...base, kind: 'request', label: 'Request started' };
    case Trace.AgentRequestEnd.key: {
      const data = decode(Trace.AgentRequestEnd.schema, event.data);
      return {
        ...base,
        kind: 'request',
        label: `Request ${data?.status ?? 'ended'}`,
        level: data?.status === 'error' ? 'error' : data?.status === 'interrupted' ? 'warn' : undefined,
        detail: data?.error,
      };
    }
    case Trace.TaskStatusChanged.key: {
      const data = decode(Trace.TaskStatusChanged.schema, event.data);
      return {
        ...base,
        kind: 'task',
        label: data?.status === 'started' ? 'Task started' : `Task ${data?.status ?? 'updated'}`,
        level: data?.status === 'failed' ? 'error' : undefined,
        detail: data,
      };
    }
    case Trace.DelegationSpawned.key: {
      const data = decode(Trace.DelegationSpawned.schema, event.data);
      return { ...base, kind: 'delegation', label: 'Delegated', detail: data };
    }
    case Trace.OperationStart.key: {
      const data = decode(Trace.OperationStart.schema, event.data);
      return { ...base, kind: 'operation', label: data?.name ?? data?.key ?? 'Operation' };
    }
    case Trace.OperationEnd.key: {
      const data = decode(Trace.OperationEnd.schema, event.data);
      const failed = data?.outcome === 'failure';
      return {
        ...base,
        kind: 'operation',
        label: data?.name ?? data?.key ?? 'Operation',
        level: failed ? 'error' : undefined,
        detail: failed ? data?.error : undefined,
      };
    }
    case Trace.CompleteBlock.key: {
      const data = decode(Trace.CompleteBlock.schema, event.data);
      if (data?.block._tag === 'toolCall') {
        return { ...base, kind: 'tool', label: data.block.name };
      }
      if (data?.block._tag === 'text' && data.role === 'user') {
        return { ...base, kind: 'message', label: data.block.text.split('\n')[0] ?? '' };
      }
      return undefined;
    }
    default:
      return undefined;
  }
};
