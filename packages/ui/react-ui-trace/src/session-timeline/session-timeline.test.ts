//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import { TestTraceService } from '@dxos/compute/testing';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Feed, Obj, Ref } from '@dxos/echo';
import { EID, EntityId, URI } from '@dxos/keys';
import { Task } from '@dxos/types';

import subAgentFixture from '../execution-graph/testing/sub-agent-delegation.json';
import { buildSessionTimeline, readTaskStatusChanges } from './session-timeline.ts';
import { type Session } from './types.ts';

/** The plain-JSON shape the fixture was captured in, before being replayed as real trace messages. */
interface RawTraceMessage {
  readonly meta: {
    readonly pid?: string;
    readonly parentPid?: string;
    readonly processName?: string;
    readonly space?: string;
  };
  readonly isEphemeral: boolean;
  readonly events: readonly { readonly timestamp: number; readonly type: string; readonly data: unknown }[];
}

// External JSON → typed at this boundary as a real (if partial) shape, then replayed as the
// genuine ECHO objects `buildSpanTree` requires, rather than laundered through `unknown`.
const fixtureMessages: Trace.Message[] = (subAgentFixture as readonly RawTraceMessage[]).map((raw) =>
  Obj.make(Trace.Message, {
    meta: {
      pid: raw.meta.pid,
      parentPid: raw.meta.parentPid,
      processName: raw.meta.processName,
      space: raw.meta.space,
    },
    isEphemeral: raw.isEphemeral,
    events: raw.events,
  }),
);

const SUPERVISOR_PID = '2433a0a1-7c09-46e6-bc6f-893f104d1691';
const SUB_AGENT_PID = 'cf8f7243-5b1d-4902-b158-70d9107d5f43';

const MESSAGE_ID = '01HQ0000000000000000000000';

describe('buildSessionTimeline', () => {
  test('fixture: attaches the sub-agent span to the supervisor session without a task join', ({ expect }) => {
    const task = Task.make({ title: 'Create a haiku in a new document', status: 'done' });
    const chat = makeChat('Haiku', [task]);
    const timeline = buildSessionTimeline({
      traceMessages: fixtureMessages,
      sessions: [chat.session],
      tasks: [task],
      processes: [agentProcess(SUPERVISOR_PID, chat, Process.State.SUCCEEDED)],
    });

    const session = timeline.lanes.find((lane) => lane.id === `session:${chat.id}`);
    expect(session).toMatchObject({ kind: 'session', label: 'Haiku', status: 'done', pid: SUPERVISOR_PID });
    expect(session?.start).toBe(1780800819470);
    expect(session?.end).toBe(1780800827765);
    expect(session?.tokens).toEqual({ input: 5, output: 207, total: 212 });
    expect(session?.toolCalls).toBe(2);

    // The fixture predates `delegationSpawned`, so the task stays unjoined.
    const taskLane = timeline.lanes.find((lane) => lane.id === `task:${task.id}`);
    expect(taskLane).toMatchObject({ kind: 'task', status: 'done', parentId: session?.id });
    expect(taskLane?.start).toBeUndefined();
    expect(taskLane?.pid).toBeUndefined();

    const subSession = timeline.lanes.find((lane) => lane.id === `session:${SUB_AGENT_PID}`);
    expect(subSession).toMatchObject({
      kind: 'session',
      label: 'Run Routine',
      status: 'done',
      parentId: session?.id,
      start: 1780800827912,
      end: 1780800838870,
      tokens: { input: 6, output: 407, total: 413 },
      toolCalls: 3,
    });
    expect(subSession?.taskId).toBeUndefined();
    expect(subSession?.delegatedFrom?.laneId).toBe(session?.id);
    const source = timeline.markers.find((marker) => marker.id === subSession?.delegatedFrom?.markerId);
    expect(source?.laneId).toBe(session?.id);
    expect(source?.timestamp).toBeLessThanOrEqual(1780800827912);

    const subMarkers = timeline.markers.filter((marker) => marker.laneId === subSession?.id);
    expect(subMarkers.map((marker) => marker.kind)).toContain('tool');
    expect(subMarkers.find((marker) => marker.label === 'Add artifact' && marker.level === 'error')).toBeDefined();
    expect(subMarkers.find((marker) => marker.kind === 'message')?.label).toBe(
      'Complete the following task and report the result concisely.',
    );
    // Tool operations under the supervisor are markers on its lane, not child sessions.
    expect(timeline.lanes.filter((lane) => lane.kind === 'session')).toHaveLength(2);
    expect(timeline.markers.find((marker) => marker.label === 'Delegate task')?.laneId).toBe(session?.id);
    // The unrelated `Update Chat Name` operation has no session pid and is dropped.
    expect(timeline.markers.find((marker) => marker.label === 'Update Chat Name')).toBeUndefined();
    expect(timeline.range).toEqual({ start: 1780800819470, end: 1780800838870 });
  });

  test('fixture: groups by agent pid when no chats are supplied', ({ expect }) => {
    const timeline = buildSessionTimeline({ traceMessages: fixtureMessages });
    expect(timeline.lanes.map((lane) => lane.id)).toEqual([`session:${SUPERVISOR_PID}`, `session:${SUB_AGENT_PID}`]);
    expect(timeline.lanes[0]?.label).toBe('Agent');
  });

  it.effect(
    'running session with a blocked and a running task',
    Effect.fnUntraced(function* ({ expect }) {
      const first = Task.make({ title: 'First', status: 'started' });
      const second = Task.make({ title: 'Second', status: 'todo', dependsOn: [Ref.make(first)] });
      const chat = makeChat('Work', [first, second]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {});
          yield* Trace.write(Trace.CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'go' },
          });
          yield* Trace.write(Trace.DelegationSpawned, { taskId: first.id, pid: 'sub' });
          yield* TestTraceService.withMeta(
            { pid: 'sub', parentPid: 'agent' },
            Trace.write(Trace.OperationStart, { key: 'run', name: 'Run Instructions' }),
          );
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [first, second],
        processes: [
          agentProcess('agent', chat, Process.State.RUNNING),
          { ...agentProcess('sub', chat, Process.State.RUNNING), key: 'run', parentPid: Process.ID.make('agent') },
        ],
        now: 100,
      });

      // The delegated task is represented by its session alone — no task lane doubles it — and the
      // dependency on it follows to that session.
      const [session, subSession, secondLane] = timeline.lanes;
      expect(timeline.lanes).toHaveLength(3);
      expect(session).toMatchObject({ kind: 'session', status: 'running', start: 1, end: undefined });
      expect(subSession).toMatchObject({
        kind: 'session',
        label: 'First',
        status: 'running',
        taskId: first.id,
        pid: 'sub',
        start: 4,
        end: undefined,
        delegatedFrom: {
          laneId: session?.id,
          markerId: timeline.markers.find((marker) => marker.kind === 'delegation')?.id,
        },
      });
      expect(secondLane).toMatchObject({ kind: 'task', status: 'blocked', blockedOn: [subSession?.id] });
      expect(timeline.range).toEqual({ start: 1, end: 100 });
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'cuts the session into task segments from the status events',
    Effect.fnUntraced(function* ({ expect }) {
      const first = Task.make({ title: 'First', status: 'done' });
      const second = Task.make({ title: 'Second', status: 'started' });
      const chat = makeChat('Segmented', [first, second]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* toolCall('Search'); // 2 — before any task started, stays on the session.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: first.id, title: 'First', status: 'started' }); // 3.
          yield* toolCall('Read file'); // 4.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: first.id,
            title: 'First',
            status: 'done',
            previousStatus: 'started',
          }); // 5.
          yield* toolCall('Think'); // 6 — between segments.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: second.id, title: 'Second', status: 'started' }); // 7.
          yield* toolCall('Write file'); // 8.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [first, second],
        now: 20,
      });
      const sessionId = `session:${chat.id}`;
      const firstLane = timeline.lanes.find((lane) => lane.id === `task:${first.id}`);
      const secondLane = timeline.lanes.find((lane) => lane.id === `task:${second.id}`);
      // The first task's lane is bounded by its status events; the second one is still open.
      expect(firstLane).toMatchObject({ kind: 'task', status: 'done', start: 3, end: 5 });
      expect(secondLane).toMatchObject({ kind: 'task', status: 'running', start: 7, end: undefined });

      // Every event inside a segment is that task's; the rest stay on the session.
      const lanesByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker.laneId]));
      expect(lanesByLabel.get('Search')).toBe(sessionId);
      expect(lanesByLabel.get('Read file')).toBe(firstLane?.id);
      expect(lanesByLabel.get('Think')).toBe(sessionId);
      expect(lanesByLabel.get('Write file')).toBe(secondLane?.id);
      expect(lanesByLabel.get('Request started')).toBe(sessionId);

      // Start and finish are drawn as nodes on the task's own lane.
      const taskMarkers = timeline.markers.filter((marker) => marker.kind === 'task');
      expect(taskMarkers.map(({ laneId, label, timestamp }) => ({ laneId, label, timestamp }))).toEqual([
        { laneId: firstLane?.id, label: 'Task started', timestamp: 3 },
        { laneId: firstLane?.id, label: 'Task done', timestamp: 5 },
        { laneId: secondLane?.id, label: 'Task started', timestamp: 7 },
      ]);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'cuts a delegated run, where a task is only ever closed',
    Effect.fnUntraced(function* ({ expect }) {
      // Delegation marks every task it hands over `started`, so the agent's only event per task is
      // the one closing it — the cut comes from the previous boundary instead.
      const first = Task.make({ title: 'First', status: 'done' });
      const second = Task.make({ title: 'Second', status: 'done' });
      const chat = makeChat('Delegated', [first, second]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* toolCall('Read file'); // 2.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: first.id,
            title: 'First',
            status: 'done',
            previousStatus: 'started',
          }); // 3.
          yield* toolCall('Write file'); // 4.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: second.id,
            title: 'Second',
            status: 'done',
            previousStatus: 'started',
          }); // 5.
          yield* Trace.write(Trace.AgentRequestEnd, { status: 'success' }); // 6.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [first, second],
      });
      const firstLane = timeline.lanes.find((lane) => lane.id === `task:${first.id}`);
      const secondLane = timeline.lanes.find((lane) => lane.id === `task:${second.id}`);
      expect(firstLane).toMatchObject({ start: 1, end: 3 });
      expect(secondLane).toMatchObject({ start: 3, end: 5 });
      const lanesByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker.laneId]));
      expect(lanesByLabel.get('Read file')).toBe(firstLane?.id);
      expect(lanesByLabel.get('Write file')).toBe(secondLane?.id);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'a task belonging to no lane on this chart cuts nothing',
    Effect.fnUntraced(function* ({ expect }) {
      const mine = Task.make({ title: 'Mine', status: 'done' });
      const other = Task.make({ title: 'Elsewhere', status: 'started' });
      // A second checklist task keeps the session a tree; a lone task folds into its session lane.
      const later = Task.make({ title: 'Later', status: 'todo' });
      const chat = makeChat('Scoped', [mine, later]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: mine.id, title: 'Mine', status: 'started' }); // 2.
          yield* toolCall('Read file'); // 3.
          // A task on somebody else's list: it must neither close `Mine` nor move the boundary.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: other.id, title: 'Elsewhere', status: 'started' }); // 4.
          yield* toolCall('Write file'); // 5.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: mine.id,
            title: 'Mine',
            status: 'done',
            previousStatus: 'started',
          }); // 6.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [mine, other, later],
      });
      const laneId = `task:${mine.id}`;
      expect(timeline.lanes.find((lane) => lane.id === laneId)).toMatchObject({ start: 2, end: 6 });
      const lanesByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker.laneId]));
      expect(lanesByLabel.get('Read file')).toBe(laneId);
      expect(lanesByLabel.get('Write file')).toBe(laneId);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    "a task started over an open one closes it at the boundary, which is the newcomer's",
    Effect.fnUntraced(function* ({ expect }) {
      const first = Task.make({ title: 'First', status: 'started' });
      const second = Task.make({ title: 'Second', status: 'started' });
      const chat = makeChat('Handover', [first, second]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: first.id, title: 'First', status: 'started' }); // 2.
          yield* toolCall('Read file'); // 3.
          // No close for the first: starting the second is what ends it.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: second.id, title: 'Second', status: 'started' }); // 4.
          yield* toolCall('Write file'); // 5.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [first, second],
      });
      expect(timeline.lanes.find((lane) => lane.id === `task:${first.id}`)).toMatchObject({ start: 2, end: 4 });
      expect(timeline.lanes.find((lane) => lane.id === `task:${second.id}`)).toMatchObject({
        start: 4,
        end: undefined,
      });
      // The two segments share the boundary at 4; the second task's own start node sits on its lane.
      const taskMarkers = timeline.markers.filter((marker) => marker.kind === 'task');
      expect(taskMarkers.map(({ laneId, timestamp }) => ({ laneId, timestamp }))).toEqual([
        { laneId: `task:${first.id}`, timestamp: 2 },
        { laneId: `task:${second.id}`, timestamp: 4 },
      ]);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'a session working a single task is one lane, carrying the task and its markers',
    Effect.fnUntraced(function* ({ expect }) {
      const task = Task.make({ title: 'Only', status: 'started' });
      const chat = makeChat('Only', [task]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: task.id, title: 'Only', status: 'started' }); // 2.
          yield* toolCall('Read file'); // 3.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({ traceMessages: messages, sessions: [chat.session], tasks: [task] });
      expect(timeline.lanes).toHaveLength(1);
      expect(timeline.lanes[0]).toMatchObject({ id: `session:${chat.id}`, kind: 'session', taskId: task.id });
      const lanesByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker.laneId]));
      expect(lanesByLabel.get('Read file')).toBe(`session:${chat.id}`);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'a run whose process ended without a request end closes at its last event, and the axis stops following now',
    Effect.fnUntraced(function* ({ expect }) {
      const task = Task.make({ title: 'Only', status: 'started' });
      const chat = makeChat('Only', [task]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* toolCall('Read file'); // 2 — the run dies here: no Trace.AgentRequestEnd.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const now = 2 + 60 * 60_000;
      const dead = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [task],
        processes: [agentProcess('agent', chat, Process.State.FAILED)],
        now,
      });
      expect(dead.lanes[0]).toMatchObject({ kind: 'session', status: 'failed', start: 1, end: 2 });
      expect(dead.range).toEqual({ start: 1, end: 2 });

      // Without a process record the begin is taken as still in flight — but an hour of silence
      // keeps the axis on the events rather than on now.
      const unknown = buildSessionTimeline({ traceMessages: messages, sessions: [chat.session], tasks: [task], now });
      expect(unknown.lanes[0]).toMatchObject({ status: 'running', end: undefined });
      expect(unknown.range).toEqual({ start: 1, end: 2 });
      const fresh = buildSessionTimeline({ traceMessages: messages, sessions: [chat.session], tasks: [task], now: 5 });
      expect(fresh.range).toEqual({ start: 1, end: 5 });
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'putting a task back to todo ends its stretch as surely as finishing it',
    Effect.fnUntraced(function* ({ expect }) {
      const task = Task.make({ title: 'Deferred', status: 'todo' });
      const later = Task.make({ title: 'Later', status: 'todo' });
      const chat = makeChat('Deferred', [task, later]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: task.id, title: 'Deferred', status: 'started' }); // 2.
          yield* toolCall('Read file'); // 3.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: task.id,
            title: 'Deferred',
            status: 'todo',
            previousStatus: 'started',
          }); // 4.
          yield* toolCall('Think'); // 5 — after the task was put down, so the session's.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [task, later],
      });
      expect(timeline.lanes.find((lane) => lane.id === `task:${task.id}`)).toMatchObject({ start: 2, end: 4 });
      const lanesByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker.laneId]));
      expect(lanesByLabel.get('Read file')).toBe(`task:${task.id}`);
      expect(lanesByLabel.get('Think')).toBe(`session:${chat.id}`);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'a task dismissed or re-closed claims no stretch of the run',
    Effect.fnUntraced(function* ({ expect }) {
      const dismissed = Task.make({ title: 'Dismissed', status: 'blocked' });
      const worked = Task.make({ title: 'Worked', status: 'done' });
      const chat = makeChat('Closes', [dismissed, worked]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          // Never started, so it owns nothing — not the reading the agent did before it said so.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: dismissed.id,
            title: 'Dismissed',
            status: 'blocked',
            previousStatus: 'todo',
          }); // 2.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: worked.id, title: 'Worked', status: 'started' }); // 3.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: worked.id,
            title: 'Worked',
            status: 'review',
            previousStatus: 'started',
          }); // 4.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: dismissed.id, title: 'Dismissed', status: 'started' }); // 5.
          yield* toolCall('Unblock'); // 6.
          // The sign-off on a task closed at 4: it must not stretch that lane over this one's work.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: worked.id,
            title: 'Worked',
            status: 'done',
            previousStatus: 'review',
          }); // 7.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [dismissed, worked],
      });
      expect(timeline.lanes.find((lane) => lane.id === `task:${worked.id}`)).toMatchObject({ start: 3, end: 4 });
      expect(timeline.lanes.find((lane) => lane.id === `task:${dismissed.id}`)).toMatchObject({
        start: 5,
        end: undefined,
      });
      const unblock = timeline.markers.find((marker) => marker.label === 'Unblock');
      expect(unblock?.laneId).toBe(`task:${dismissed.id}`);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'a close arriving after the next task started leaves that task the stretch',
    Effect.fnUntraced(function* ({ expect }) {
      const first = Task.make({ title: 'First', status: 'done' });
      const second = Task.make({ title: 'Second', status: 'started' });
      const chat = makeChat('Interleaved', [first, second]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: first.id, title: 'First', status: 'started' }); // 2.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: second.id, title: 'Second', status: 'started' }); // 3.
          yield* toolCall('Write file'); // 4.
          // The first task's close lands after the second one is under way; the stretch is the
          // second task's, so nothing may be minted over it.
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: first.id,
            title: 'First',
            status: 'done',
            previousStatus: 'started',
          }); // 5.
          yield* toolCall('Read file'); // 6.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [first, second],
      });
      expect(timeline.lanes.find((lane) => lane.id === `task:${first.id}`)).toMatchObject({ start: 2, end: 3 });
      expect(timeline.lanes.find((lane) => lane.id === `task:${second.id}`)).toMatchObject({
        start: 3,
        end: undefined,
      });
      const lanesByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker.laneId]));
      expect(lanesByLabel.get('Write file')).toBe(`task:${second.id}`);
      expect(lanesByLabel.get('Read file')).toBe(`task:${second.id}`);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'a delegated task keeps its markers on the session that handed it over',
    Effect.fnUntraced(function* ({ expect }) {
      const task = Task.make({ title: 'Delegated', status: 'done' });
      const chat = makeChat('Handover', [task]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: task.id, title: 'Delegated', status: 'started' }); // 2.
          yield* Trace.write(Trace.DelegationSpawned, { taskId: task.id, pid: 'sub' }); // 3.
          yield* toolCall('Wait'); // 4.
          yield* TestTraceService.withMeta(
            { pid: 'sub', parentPid: 'agent' },
            Effect.gen(function* () {
              yield* Trace.write(Trace.OperationStart, { key: 'run', name: 'Run Instructions' }); // 5.
              yield* Trace.write(Trace.CompleteBlock, {
                messageId: MESSAGE_ID,
                role: 'assistant',
                block: { _tag: 'text', text: 'done' },
              }); // 6.
              yield* Trace.write(Trace.OperationEnd, { key: 'run', outcome: 'success' }); // 7.
            }),
          );
          yield* Trace.write(Trace.TaskStatusChanged, {
            taskId: task.id,
            title: 'Delegated',
            status: 'done',
            previousStatus: 'started',
          }); // 8.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({ traceMessages: messages, sessions: [chat.session], tasks: [task] });
      const sessionId = `session:${chat.id}`;
      // The task lane was replaced by the child session, drawn with the child's own span.
      expect(timeline.lanes.find((lane) => lane.id === `task:${task.id}`)).toBeUndefined();
      const subSession = timeline.lanes.find((lane) => lane.id === 'session:sub');
      expect(subSession).toMatchObject({ taskId: task.id, start: 5, end: 7 });
      // The supervisor's own markers stay on the supervisor, rather than moving onto a bar whose
      // span does not contain them.
      const lanesByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker.laneId]));
      expect(lanesByLabel.get('Wait')).toBe(sessionId);
      expect(lanesByLabel.get('Task started')).toBe(sessionId);
      expect(lanesByLabel.get('Delegated')).toBe(sessionId);
    }, Effect.provide(TestTraceService.layer)),
  );

  it.effect(
    'joins the sub-agent by the delegationSpawned event and sums tokens per lane',
    Effect.fnUntraced(function* ({ expect }) {
      const task = Task.make({ title: 'Write', status: 'done' });
      const chat = makeChat('Tokens', [task]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {});
          yield* stats(10, 20, 1);
          yield* Trace.write(Trace.DelegationSpawned, { taskId: task.id, pid: 'sub' });
          yield* Trace.write(Trace.AgentRequestEnd, { status: 'success' });
          yield* TestTraceService.withMeta(
            { pid: 'sub', parentPid: 'agent' },
            Effect.gen(function* () {
              yield* Trace.write(Trace.OperationStart, { key: 'run', name: 'Run Instructions' });
              yield* stats(100, 200, 2);
              yield* stats(1, 2, 0);
              yield* Trace.write(Trace.OperationEnd, { key: 'run', outcome: 'success' });
            }),
          );
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({ traceMessages: messages, sessions: [chat.session], tasks: [task] });
      const session = timeline.lanes.find((lane) => lane.id === `session:${chat.id}`);
      const subSession = timeline.lanes.find((lane) => lane.id === 'session:sub');
      expect(session).toMatchObject({ status: 'done', tokens: { input: 10, output: 20, total: 30 }, toolCalls: 1 });
      expect(subSession).toMatchObject({
        status: 'done',
        start: 5,
        end: 8,
        tokens: { input: 101, output: 202, total: 303 },
        toolCalls: 2,
      });
      const spawn = timeline.markers.find((marker) => marker.kind === 'delegation');
      expect(spawn?.laneId).toBe(session?.id);
      expect(subSession?.delegatedFrom).toEqual({ laneId: session?.id, markerId: spawn?.id });
    }, Effect.provide(TestTraceService.layer)),
  );
  test('bounds task lanes and threads their nodes from the edit history alone', ({ expect }) => {
    const first = Task.make({ title: 'First', status: 'done' });
    const second = Task.make({ title: 'Second', status: 'started' });
    Task.ask(first, { text: 'Which schema?', date: at(1_500) });
    const chat = makeChat('History', [first, second]);

    const timeline = buildSessionTimeline({
      traceMessages: [],
      sessions: [chat.session],
      tasks: [first, second],
      taskStatusChanges: new Map([
        [
          first.id,
          [
            { timestamp: 1_000, status: 'started', previousStatus: 'todo' },
            { timestamp: 2_000, status: 'done', previousStatus: 'started' },
          ],
        ],
        [second.id, [{ timestamp: 3_000, status: 'started', previousStatus: 'todo' }]],
      ]),
    });

    const firstLane = timeline.lanes.find((lane) => lane.id === `task:${first.id}`);
    const secondLane = timeline.lanes.find((lane) => lane.id === `task:${second.id}`);
    expect(firstLane).toMatchObject({ status: 'done', start: 1_000, end: 2_000 });
    expect(secondLane).toMatchObject({ status: 'running', start: 3_000, end: undefined });
    expect(
      timeline.markers
        .filter((marker) => marker.laneId === firstLane?.id)
        .toSorted((a, b) => a.timestamp - b.timestamp)
        .map(({ label, timestamp, level }) => ({ label, timestamp, level })),
    ).toEqual([
      { label: 'Task started', timestamp: 1_000, level: undefined },
      { label: 'Which schema?', timestamp: 1_500, level: 'warn' },
      { label: 'Task done', timestamp: 2_000, level: undefined },
    ]);
    expect(timeline.range).toEqual({ start: 1_000, end: 3_000 });
  });

  it.effect(
    'draws a status move once when both the trace and the edit history record it',
    Effect.fnUntraced(function* ({ expect }) {
      const first = Task.make({ title: 'First', status: 'started' });
      const second = Task.make({ title: 'Second', status: 'todo' });
      const chat = makeChat('Both', [first, second]);
      yield* TestTraceService.withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(Trace.AgentRequestBegin, {}); // 1.
          yield* Trace.write(Trace.TaskStatusChanged, { taskId: first.id, title: 'First', status: 'started' }); // 2.
        }),
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [first, second],
        taskStatusChanges: new Map([[first.id, [{ timestamp: 2, status: 'started', previousStatus: 'todo' }]]]),
      });

      const markers = timeline.markers.filter((marker) => marker.kind === 'task');
      // The trace event is drawn through the history, which takes its pid.
      expect(markers.map(({ laneId, label, pid }) => ({ laneId, label, pid }))).toEqual([
        { laneId: `task:${first.id}`, label: 'Task started', pid: 'agent' },
      ]);
    }, Effect.provide(TestTraceService.layer)),
  );

  test('closes a finished task whose history is missing its closing move', ({ expect }) => {
    const first = Task.make({ title: 'First', status: 'done' });
    const second = Task.make({ title: 'Second', status: 'todo' });
    const chat = makeChat('Unrecorded', [first, second]);

    const timeline = buildSessionTimeline({
      traceMessages: [],
      sessions: [chat.session],
      tasks: [first, second],
      taskStatusChanges: new Map([[first.id, [{ timestamp: 1_000, status: 'started', previousStatus: 'todo' }]]]),
    });

    expect(timeline.lanes.find((lane) => lane.id === `task:${first.id}`)).toMatchObject({ start: 1_000, end: 1_000 });
  });

  it.effect(
    'draws a recorded status move the trace recorded off the chart',
    Effect.fnUntraced(function* ({ expect }) {
      const first = Task.make({ title: 'First', status: 'started' });
      const second = Task.make({ title: 'Second', status: 'todo' });
      const chat = makeChat('Elsewhere', [first, second]);
      // A process belonging to no session on this chart moved the task.
      yield* TestTraceService.withMeta(
        { pid: 'stranger' },
        Trace.write(Trace.TaskStatusChanged, { taskId: first.id, title: 'First', status: 'started' }), // 1.
      );

      const messages = yield* TestTraceService.messages;
      const timeline = buildSessionTimeline({
        traceMessages: messages,
        sessions: [chat.session],
        tasks: [first, second],
        taskStatusChanges: new Map([[first.id, [{ timestamp: 1, status: 'started', previousStatus: 'todo' }]]]),
      });

      expect(
        timeline.markers
          .filter((marker) => marker.laneId === `task:${first.id}`)
          .map(({ label, pid }) => ({ label, pid })),
      ).toEqual([{ label: 'Task started', pid: undefined }]);
    }, Effect.provide(TestTraceService.layer)),
  );

  test('reads no status moves for a task outside a database, which keeps no history', ({ expect }) => {
    expect(readTaskStatusChanges(Task.make({ title: 'Loose', status: 'done' }))).toEqual([]);
  });
});

const agentProcess = (pid: string, chat: TestChat, state: Process.State): Process.Info => ({
  pid: Process.ID.make(pid),
  parentPid: null,
  key: 'agent',
  params: {
    name: null,
    annotations: Annotation.buildDictionary((dictionary) => {
      Annotation.setDictionary(dictionary, Process.HarnessHostAnnotation, true);
      Annotation.setDictionary(dictionary, Process.TargetAnnotation, URI.make(chat.session.uri));
    }),
  },
  environment: {},
  state,
  error: null,
  startedAt: 0,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
});

/** A chat reduced to what the builder joins on, with the feed ref its trace meta would carry. */
type TestChat = { id: string; feed: Ref.Ref<Feed.Feed>; session: Session };

const makeChat = (name: string, tasks: readonly Task.Task[]): TestChat => {
  const feed = Feed.make();
  const id = EntityId.random();
  return {
    id,
    feed: Ref.make(feed),
    session: {
      id,
      label: name,
      uri: EID.make({ entityId: id }).toString(),
      feedId: feed.id,
      taskIds: tasks.map((task) => task.id),
    },
  };
};

/** An ISO date `ms` after the epoch, for history entries set against the trace's clock. */
const at = (ms: number): string => new Date(ms).toISOString();

const toolCall = (name: string) =>
  Trace.write(Trace.CompleteBlock, {
    messageId: MESSAGE_ID,
    role: 'assistant',
    block: { _tag: 'toolCall', toolCallId: name, name, input: '{}', providerExecuted: false },
  });

const stats = (input: number, output: number, toolCalls: number) =>
  Trace.write(Trace.CompleteBlock, {
    messageId: MESSAGE_ID,
    role: 'assistant',
    block: {
      _tag: 'stats',
      usage: { inputTokens: input, outputTokens: output, totalTokens: input + output },
      toolCalls,
    },
  });
