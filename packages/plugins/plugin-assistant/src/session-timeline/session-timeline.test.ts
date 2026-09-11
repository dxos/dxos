//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { AGENT_PROCESS_KEY } from '@dxos/agent-runtime';
import { AgentRequestBegin, AgentRequestEnd, CompleteBlock, DelegationSpawned } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Feed, Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { collectTraceEvents, withMeta } from '../execution-graph/testing/index.ts';
import subAgentFixture from '../execution-graph/testing/sub-agent-delegation.json';
import { buildSessionTimeline } from './session-timeline.ts';

// External JSON → typed at this boundary; the builder reads only `meta`/`events`.
const fixtureMessages = subAgentFixture as unknown as Trace.Message[];

const SUPERVISOR_PID = '2433a0a1-7c09-46e6-bc6f-893f104d1691';
const SUB_AGENT_PID = 'cf8f7243-5b1d-4902-b158-70d9107d5f43';

const MESSAGE_ID = '01HQ0000000000000000000000';

const makeChat = (name: string, tasks: readonly Task.Task[]) =>
  Chat.make({ name, feed: Ref.make(Feed.make()), tasks: tasks.map((task) => Ref.make(task)) });

const stats = (input: number, output: number, toolCalls: number) =>
  Trace.write(CompleteBlock, {
    messageId: MESSAGE_ID,
    role: 'assistant',
    block: {
      _tag: 'stats',
      usage: { inputTokens: input, outputTokens: output, totalTokens: input + output },
      toolCalls,
    },
  });

describe('buildSessionTimeline', () => {
  test('fixture: attaches the sub-agent span to the supervisor session without a task join', ({ expect }) => {
    const task = Task.make({ title: 'Create a haiku in a new document', status: 'done' });
    const chat = makeChat('Haiku', [task]);
    const timeline = buildSessionTimeline({
      traceMessages: fixtureMessages,
      chats: [chat],
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

  test('running session with a blocked and a running task', ({ expect }) => {
    const first = Task.make({ title: 'First', status: 'started' });
    const second = Task.make({ title: 'Second', status: 'todo', dependsOn: [Ref.make(first)] });
    const chat = makeChat('Work', [first, second]);
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* Trace.write(CompleteBlock, {
            messageId: MESSAGE_ID,
            role: 'user',
            block: { _tag: 'text', text: 'go' },
          });
          yield* Trace.write(DelegationSpawned, { taskId: first.id, pid: 'sub' });
          yield* withMeta(
            { pid: 'sub', parentPid: 'agent' },
            Trace.write(Trace.OperationStart, { key: 'run', name: 'Run Instructions' }),
          );
        }),
      ),
    );

    const timeline = buildSessionTimeline({
      traceMessages: messages,
      chats: [chat],
      tasks: [first, second],
      processes: [
        agentProcess('agent', chat, Process.State.RUNNING),
        { ...agentProcess('sub', chat, Process.State.RUNNING), key: 'run', parentPid: Process.ID.make('agent') },
      ],
      now: 100,
    });

    const [session, firstLane, subSession, secondLane] = timeline.lanes;
    expect(session).toMatchObject({ kind: 'session', status: 'running', start: 1, end: undefined });
    expect(firstLane).toMatchObject({ kind: 'task', status: 'running', pid: 'sub', start: 4, end: undefined });
    expect(subSession).toMatchObject({
      kind: 'session',
      label: 'First',
      status: 'running',
      taskId: first.id,
      pid: 'sub',
      delegatedFrom: {
        laneId: session?.id,
        markerId: timeline.markers.find((marker) => marker.kind === 'delegation')?.id,
      },
    });
    expect(secondLane).toMatchObject({ kind: 'task', status: 'blocked', blockedOn: [`task:${first.id}`] });
    expect(timeline.range).toEqual({ start: 1, end: 100 });
  });

  test('joins the sub-agent by the delegationSpawned event and sums tokens per lane', ({ expect }) => {
    const task = Task.make({ title: 'Write', status: 'done' });
    const chat = makeChat('Tokens', [task]);
    const messages = collectTraceEvents(
      withMeta(
        { pid: 'agent', conversation: chat.feed },
        Effect.gen(function* () {
          yield* Trace.write(AgentRequestBegin, {});
          yield* stats(10, 20, 1);
          yield* Trace.write(DelegationSpawned, { taskId: task.id, pid: 'sub' });
          yield* Trace.write(AgentRequestEnd, { status: 'success' });
          yield* withMeta(
            { pid: 'sub', parentPid: 'agent' },
            Effect.gen(function* () {
              yield* Trace.write(Trace.OperationStart, { key: 'run', name: 'Run Instructions' });
              yield* stats(100, 200, 2);
              yield* stats(1, 2, 0);
              yield* Trace.write(Trace.OperationEnd, { key: 'run', outcome: 'success' });
            }),
          );
        }),
      ),
    );

    const timeline = buildSessionTimeline({ traceMessages: messages, chats: [chat], tasks: [task] });
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
  });
});

const agentProcess = (pid: string, chat: Chat.Chat, state: Process.State): Process.Info => ({
  pid: Process.ID.make(pid),
  parentPid: null,
  key: AGENT_PROCESS_KEY,
  params: {
    name: null,
    annotations: Annotation.buildDictionary((dictionary) => {
      Annotation.setDictionary(dictionary, Process.TargetAnnotation, Obj.getURI(chat));
    }),
  },
  environment: {},
  state,
  error: null,
  startedAt: 0,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
});
