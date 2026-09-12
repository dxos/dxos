//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AGENT_PROCESS_KEY } from '@dxos/agent-runtime';
import { AgentRequestBegin, AgentRequestEnd, CompleteBlock, DelegationSpawned } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Task } from '@dxos/types';

import { type Span, buildSpanTree, flattenSpanTree } from '#execution-graph';

import { type Lane, type LaneStatus, type Marker, type SessionTimeline, type TokenUsage } from './types.ts';

export interface BuildSessionTimelineInput {
  traceMessages: readonly Trace.Message[];
  processes?: readonly Process.Info[];
  chats?: readonly Chat.Chat[];
  tasks?: readonly Task.Task[];
  /** Reference time; extends the range past open lanes. */
  now?: number;
}

const ACTIVE_STATES = new Set<Process.State>([Process.State.RUNNING, Process.State.HYBERNATING]);

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
  chat?: Chat.Chat;
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
 * A status that ends the agent's work on a task. `blocked` is one: the agent moved on, and whatever
 * it does next is no longer that task's.
 */
const TERMINAL_STATUS = new Set<Task.Status>(['done', 'review', 'failed', 'cancelled', 'duplicate', 'blocked']);

/**
 * Cuts a session's events into one segment per task worked, from the status events its task tools
 * write. Only tasks in `taskIds` — the session's own checklist — take part: an agent is free to move
 * a task belonging to nothing on this chart, and such an event must not close the segment that is
 * open or move the boundary.
 *
 * A `started` event opens a segment and closes the one still open — the agent keeps exactly one task
 * in progress. A task can also finish without one: delegation marks every task it hands over
 * `started` before the agent's first turn, so the run's only event for that task is the one closing
 * it. Such a task gets the stretch since the last boundary, which is where its work happened — but
 * only on the transition out of `started`, so a task merely dismissed (`todo` → `blocked`) claims
 * nothing, and a second close (`review` → `done`, arriving while another task is active) does not
 * mint a segment overlapping it.
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
    } else if (TERMINAL_STATUS.has(data.status)) {
      const started = segments.findLast((candidate) => candidate.taskId === data.taskId && candidate.end === undefined);
      if (started) {
        close(started, event.timestamp);
      } else if (data.previousStatus === 'started') {
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
  chats,
  tasks = [],
  now,
}: BuildSessionTimelineInput): SessionTimeline => {
  const root = buildSpanTree(traceMessages);
  const spans = flattenSpanTree(root);
  const events = spans.flatMap((span) => span.events).sort((a, b) => a.timestamp - b.timestamp);
  const requestBegins = events.filter(
    (event): event is Trace.FlatEvent & { meta: { pid: string } } =>
      event.type === AgentRequestBegin.key && event.meta.pid !== undefined,
  );

  // The agent process targets the chat; its trace meta carries the chat's feed.
  const agentPidsByChat = new Map<string, string[]>();
  for (const process of processes) {
    if (process.key !== AGENT_PROCESS_KEY) {
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
  if (chats) {
    for (const chat of chats) {
      if (chat.tasks.length === 0) {
        continue;
      }
      const feed = Chat.feedEntityId(chat);
      const pids = new Set<string>(agentPidsByChat.get(entityKey(Obj.getURI(chat))) ?? []);
      for (const event of requestBegins) {
        if (feed !== undefined && eventFeedKey(event) === feed) {
          pids.add(event.meta.pid);
        }
      }
      // A feed or object id is not a name: an unnamed chat reads as the session it is until the
      // naming turn lands.
      sources.push({ key: chat.id, label: chat.name?.trim() || 'Session', chat, pids });
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
    const begins = sessionEvents.filter((event) => event.type === AgentRequestBegin.key);
    const ends = sessionEvents.filter((event) => event.type === AgentRequestEnd.key);
    const requestOpen = begins.length > ends.length;
    const processActive = [...source.pids].some((pid) => {
      const process = processByPid.get(pid);
      return process !== undefined && ACTIVE_STATES.has(process.state);
    });
    const lastEnd = ends.at(-1);
    const lastEndStatus = lastEnd ? decode(AgentRequestEnd.schema, lastEnd.data)?.status : undefined;
    const status: LaneStatus = processActive || requestOpen ? 'running' : lastEndStatus === 'error' ? 'failed' : 'done';

    lanes.push({
      id: laneId,
      kind: 'session',
      label: source.label,
      status,
      start: begins[0]?.timestamp,
      end: requestOpen ? undefined : lastEnd?.timestamp,
      chatId: source.chat?.id,
      pid: [...source.pids].at(-1),
    });
    for (const pid of source.pids) {
      laneByPid.set(pid, laneId);
    }

    // The spawn event is the only durable pid ↔ task pairing; a sub-agent's own trace carries
    // neither the task nor the conversation.
    const taskByPid = new Map<string, string>();
    for (const event of sessionEvents) {
      if (event.type === DelegationSpawned.key) {
        const data = decode(DelegationSpawned.schema, event.data);
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
      const isAgent = taskByPid.has(pid) || span.events.some((event) => event.type === CompleteBlock.key);
      return isAgent ? [{ span, pid, startEvent }] : [];
    });

    const chatTasks = source.chat
      ? source.chat.tasks
          .map((ref) => Task.refEntityId(ref))
          .map((id) => (id === undefined ? undefined : taskById.get(id)))
          .filter((task): task is Task.Task => task !== undefined)
      : [];
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
        chatId: source.chat?.id,
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
        chatId: source.chat?.id,
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
      event.type === AgentRequestBegin.key || event.type === AgentRequestEnd.key
        ? laneId
        : (segmentsBySession
            .get(laneId)
            ?.find(
              (segment) =>
                event.timestamp >= segment.start && event.timestamp <= (segment.end ?? Number.MAX_SAFE_INTEGER),
            )?.laneId ?? laneId);
    const marker = toMarker(event, `${markerLaneId}:${markers.length}`, markerLaneId);
    if (marker) {
      markers.push(marker);
      if (marker.kind === 'delegation') {
        const data = decode(DelegationSpawned.schema, event.data);
        if (data) {
          spawnMarkerByPid.set(data.pid, marker.id);
        }
      }
    }
    if (event.type === CompleteBlock.key) {
      const data = decode(CompleteBlock.schema, event.data);
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

  const times = [
    ...lanes.flatMap((lane) => [lane.start, lane.end]).filter((time): time is number => time !== undefined),
    ...markers.map((marker) => marker.timestamp),
  ];
  const hasOpen = lanes.some((lane) => lane.start !== undefined && lane.end === undefined);
  if (hasOpen && now !== undefined) {
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
    case AgentRequestBegin.key:
      return { ...base, kind: 'request', label: 'Request started' };
    case AgentRequestEnd.key: {
      const data = decode(AgentRequestEnd.schema, event.data);
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
    case DelegationSpawned.key: {
      const data = decode(DelegationSpawned.schema, event.data);
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
    case CompleteBlock.key: {
      const data = decode(CompleteBlock.schema, event.data);
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
