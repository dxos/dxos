//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import * as Trace from '@dxos/compute/Trace';
import { Feed, Obj, Ref } from '@dxos/echo';
import { EID, EntityId } from '@dxos/keys';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { Gantt } from '../components/index.ts';
import { sessionTimelineToGantt } from './gantt-mapping.ts';
import { type TaskStatusChange, buildSessionTimeline } from './session-timeline.ts';
import { type Session } from './types.ts';

const T0 = Date.UTC(2026, 8, 25, 12, 5, 22);
const MINUTE = 60_000;
const minute = (minutes: number): number => T0 + minutes * MINUTE;
const at = (minutes: number): string => new Date(minute(minutes)).toISOString();

/**
 * One session's checklist, and the status moves each task's edit history records — the story's tasks
 * live in no database, so their moves are given rather than read. With `history` off, the chart sees
 * only the trace.
 */
const makeTasks = (history: boolean) => {
  const audit = Task.make({ title: 'Audit current artifact storage', status: 'done' });
  const design = Task.make({ title: 'Design history entry schema', status: 'done' });
  const migrate = Task.make({ title: 'Write the migration', status: 'done' });
  const backfill = Task.make({
    title: 'Backfill existing tasks',
    status: 'todo',
    dependsOn: [Ref.make(migrate), Ref.make(design)],
  });
  const worked = (start: number, end: number): TaskStatusChange[] => [
    { timestamp: minute(start), status: 'started', previousStatus: 'todo' },
    { timestamp: minute(end), status: 'done', previousStatus: 'started' },
  ];
  if (history) {
    const question = Task.ask(design, {
      text: 'Keep artifacts as refs or fold them into history?',
      actor: { name: 'Scout', role: 'assistant' },
      date: at(36),
    });
    Task.answer(design, question.id, 'Keep refs', { date: at(47) });
  }
  const taskStatusChanges = new Map<string, TaskStatusChange[]>(
    history
      ? [
          [audit.id, worked(1, 26)],
          [design.id, worked(28, 55)],
          [migrate.id, worked(57, 111)],
        ]
      : [],
  );
  return { tasks: [audit, design, migrate, backfill], taskStatusChanges };
};

/** The session's own trace: two requests and the tool calls between them, with no task status events. */
const makeTrace = (feed: Ref.Ref<Feed.Feed>): Trace.Message[] => {
  const event = (minutes: number, type: string, data: unknown) => ({ timestamp: T0 + minutes * MINUTE, type, data });
  const toolCall = (minutes: number, name: string) =>
    event(minutes, Trace.CompleteBlock.key, {
      messageId: EntityId.random(),
      role: 'assistant',
      block: { _tag: 'toolCall', toolCallId: name, name, input: '{}', providerExecuted: false },
    });
  return [
    Obj.make(Trace.Message, {
      meta: { pid: 'agent', conversation: feed },
      isEphemeral: false,
      events: [
        event(0, Trace.AgentRequestBegin.key, {}),
        toolCall(4, 'Search code'),
        toolCall(12, 'Read file'),
        toolCall(20, 'Read file'),
        toolCall(33, 'Write document'),
        toolCall(42, 'Ask question'),
        event(58, Trace.AgentRequestEnd.key, { status: 'success' }),
        event(104, Trace.AgentRequestBegin.key, {}),
        toolCall(106, 'Edit file'),
        toolCall(109, 'Run tests'),
        event(113, Trace.AgentRequestEnd.key, { status: 'success' }),
      ],
    }),
  ];
};

const Timeline = ({ title, history }: { title: string; history: boolean }) => {
  const timeline = useMemo(() => {
    const feed = Feed.make();
    const { tasks, taskStatusChanges } = makeTasks(history);
    const id = EntityId.random();
    const session: Session = {
      id,
      label: 'Schema Migration: Task Artifacts to History',
      uri: EID.make({ entityId: id }).toString(),
      feedId: feed.id,
      taskIds: tasks.map((task) => task.id),
    };
    return buildSessionTimeline({
      traceMessages: makeTrace(Ref.make(feed)),
      sessions: [session],
      tasks,
      taskStatusChanges,
    });
  }, [history]);

  return (
    <div className='flex flex-col gap-1'>
      <h2 className='px-2 text-sm text-subdued'>{title}</h2>
      <Gantt.Root {...sessionTimelineToGantt(timeline)} range={timeline.range} classNames='p-2'>
        <Gantt.Legend />
        <Gantt.Chart />
        <Gantt.Meta />
      </Gantt.Root>
    </div>
  );
};

const DefaultStory = () => (
  <div className='flex flex-col gap-6 p-4'>
    <Timeline title='Trace only — task lanes have no span' history={false} />
    <Timeline title='With edit history — begin, end, status moves and questions as nodes' history={true} />
  </div>
);

const meta = {
  title: 'ui/react-ui-trace/SessionTimeline',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TaskHistory: Story = {};
