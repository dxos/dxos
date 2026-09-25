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
import { buildSessionTimeline } from './session-timeline.ts';
import { type Session } from './types.ts';

const T0 = Date.UTC(2026, 8, 25, 12, 5, 22);
const MINUTE = 60_000;
const at = (minutes: number): string => new Date(T0 + minutes * MINUTE).toISOString();

/**
 * One session's checklist. With `history`, each task carries the log its edits wrote; without, it
 * holds only its final status — all a timeline built from the trace alone could see.
 */
const makeTasks = (history: boolean): Task.Task[] => {
  const audit = Task.make({ title: 'Audit current artifact storage', status: history ? 'todo' : 'done' });
  const design = Task.make({ title: 'Design history entry schema', status: history ? 'todo' : 'done' });
  const migrate = Task.make({ title: 'Write the migration', status: history ? 'todo' : 'done' });
  const backfill = Task.make({
    title: 'Backfill existing tasks',
    status: 'todo',
    dependsOn: [Ref.make(migrate), Ref.make(design)],
  });
  if (history) {
    const agent = { name: 'Scout', role: 'assistant' as const };
    Task.setStatus(audit, 'started', { actor: agent, date: at(1) });
    Task.update(audit, { priority: 'high' }, { actor: agent, date: at(9) });
    Task.setStatus(audit, 'done', { actor: agent, date: at(26) });
    Task.setStatus(design, 'started', { actor: agent, date: at(28) });
    const question = Task.ask(design, {
      text: 'Keep artifacts as refs or fold them into history?',
      actor: agent,
      date: at(36),
    });
    Task.answer(design, question.id, 'Keep refs', { date: at(47) });
    Task.setStatus(design, 'done', { actor: agent, date: at(55) });
    Task.setStatus(migrate, 'started', { actor: agent, date: at(57) });
    Task.setStatus(migrate, 'done', { actor: agent, date: at(111) });
  }
  return [audit, design, migrate, backfill];
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
    const tasks = makeTasks(history);
    const id = EntityId.random();
    const session: Session = {
      id,
      label: 'Schema Migration: Task Artifacts to History',
      uri: EID.make({ entityId: id }).toString(),
      feedId: feed.id,
      taskIds: tasks.map((task) => task.id),
    };
    return buildSessionTimeline({ traceMessages: makeTrace(Ref.make(feed)), sessions: [session], tasks });
  }, [history]);

  return (
    <div className='flex flex-col gap-1'>
      <h2 className='px-2 text-sm text-subdued'>{title}</h2>
      <Gantt.Root lanes={timeline.lanes} markers={timeline.markers} range={timeline.range} classNames='p-2'>
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
    <Timeline title='With task history — begin, end and every entry as a node' history={true} />
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
