//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback, useMemo, useRef } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import { createMenuAction } from '@dxos/react-ui-menu';
import { TaskHistory, TaskList, TaskQuestion } from '@dxos/react-ui-task';
import * as Accordion from '@dxos/react-ui/Accordion';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { Tag, type TagHue } from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';
import { Task } from '@dxos/types';

import {
  type BoardData,
  type Goal,
  type LandChangeHandler,
  type PrStatus,
  type PullRequest,
  type TimelineEvent,
} from './types.ts';

const PR_HUES: Record<PrStatus, TagHue> = {
  draft: 'neutral',
  open: 'info',
  failing: 'error',
  landing: 'warning',
  queued: 'warning',
  merged: 'violet',
  closed: 'neutral',
};

const PR_ICONS: Record<PrStatus, string> = {
  draft: 'ph--git-pull-request--regular',
  open: 'ph--git-pull-request--regular',
  failing: 'ph--x-circle--regular',
  landing: 'ph--airplane-landing--regular',
  queued: 'ph--queue--regular',
  merged: 'ph--git-merge--regular',
  closed: 'ph--x--regular',
};

/** A title as plain text: the task list draws titles verbatim, so code ticks and `[ID]` brackets would show. */
const plain = (text: string): string => text.replace(/`([^`]*)`/g, '$1').replace(/\[([A-Z]+-\d+)\]/g, '$1');

/** A goal as a task, so the row draws with the task list's status glyphs and hues; an open question blocks it. */
const goalTask = (goal: Goal, questions: BoardData['questions']): Task.Task => {
  const blocking = questions.filter((question) => goal.blockedBy.includes(question.id) && !question.answer);
  const description = [
    ...blocking.map((question) => `- Blocked on **${question.id}**: ${question.text}`),
    ...goal.notes.map((note) => `- ${note}`),
  ].join('\n');
  return Task.make({
    title: `${goal.id} ${plain(goal.title)}`,
    status: goal.blocked ? 'blocked' : goal.status,
    ...(description ? { description } : {}),
  });
};

/** The timeline as history entries, which `TaskHistory` renders newest first with relative dates. */
const historyEntries = (timeline: TimelineEvent[]): Task.HistoryEntry[] =>
  timeline.map((event) => ({
    id: event.id,
    date: new Date(event.date).toISOString(),
    event: 'updated' as const,
    description: `${event.id} ${plain(event.title)}`,
    ...(event.by
      ? {
          actor: event.by.startsWith('agent:')
            ? { role: 'assistant' as const, name: event.by.slice(6) }
            : { role: 'user' as const, name: event.by.replace(/^user:/, '') },
        }
      : {}),
  }));

/** One collapsible section, open by default; each is its own accordion, so the page's gap separates them. */
const Section = ({
  id,
  icon,
  label,
  count,
  children,
}: {
  id: string;
  icon: string;
  label: string;
  count?: string;
  children: ReactNode;
}) => (
  <Accordion.Root border={false} defaultValue={[id]}>
    <Accordion.Item value={id} data-testid={`section-${id}`}>
      <Accordion.ItemTrigger icon={icon}>
        <span className='font-medium'>{label}</span>
        {count && (
          <Typography.Text asChild tone='muted'>
            <span> · {count}</span>
          </Typography.Text>
        )}
      </Accordion.ItemTrigger>
      <Accordion.ItemContent>{children}</Accordion.ItemContent>
    </Accordion.Item>
  </Accordion.Root>
);

/** GitHub has settled these; there is nothing left to land. */
const SETTLED = new Set<PullRequest['status']>(['merged', 'closed']);

type PrRowsProps = Pick<BoardProps, 'landing' | 'onLandChange'> & { prs: PullRequest[] };

const PrRows = ({ prs, landing = {}, onLandChange }: PrRowsProps) => {
  const rows = useRef(new Map<string, HTMLElement>());
  return (
    <Listbox.Root items={prs.map((pr) => ({ value: pr.id, label: pr.title, description: pr.branch }))}>
      <Listbox.Viewport>
        <Listbox.Content>
          {prs.map((pr) => {
            // The database is the viewer's latest choice; the session file is the fallback until one is made.
            const land = landing[pr.id] ?? pr.status === 'landing';
            return (
              <Listbox.Item
                key={pr.id}
                id={pr.id}
                data-testid={`pr-${pr.id}`}
                ref={(element: HTMLDivElement | null) => {
                  if (element) {
                    rows.current.set(pr.id, element);
                  } else {
                    rows.current.delete(pr.id);
                  }
                }}
              >
                <Listbox.ItemIcon icon={PR_ICONS[pr.status]} />
                <Listbox.ItemText>
                  <Typography.Link href={pr.url}>{pr.ref}</Typography.Link> {plain(pr.title)}
                </Listbox.ItemText>
                {pr.branch && <Listbox.ItemDescription>{pr.branch}</Listbox.ItemDescription>}
                {/* One trailing cell, so the tag and the switch share a centre line and a gap. */}
                <Layout.Flex gap='sm' align='center'>
                  <Tag hue={PR_HUES[pr.status]}>{pr.status}</Tag>
                  {onLandChange && !SETTLED.has(pr.status) && (
                    <Input.Switch
                      label='Land'
                      checked={land}
                      data-testid={`land-${pr.id}`}
                      onCheckedChange={({ checked }) => {
                        const element = rows.current.get(pr.id);
                        if (element) {
                          void onLandChange(pr, checked, element);
                        }
                      }}
                    />
                  )}
                </Layout.Flex>
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};

export type BoardProps = {
  board: BoardData;
  /** Each PR's land choice from the artifact's database, by PR id. */
  landing?: Record<string, boolean>;
  /** Present when the viewer may change landing; absent, the page shows no toggle. */
  onLandChange?: LandChangeHandler;
};

/**
 * The session board: open questions, Composer tasks and goals as task lists, pull requests and the append-only timeline, each an
 * accordion section, with when it was built in the footer.
 */
export const Board = ({ board, landing, onLandChange }: BoardProps) => {
  const updated = Typography.useRelativeTime(board.updated);
  // A goal linked to a Composer task (`task:`) is listed under Tasks, apart from the session's own goals.
  const goals = useMemo(() => board.goals.filter((goal) => !goal.task), [board]);
  const composerGoals = useMemo(() => board.goals.filter((goal) => goal.task), [board]);
  const tasks = useMemo(() => goals.map((goal) => goalTask(goal, board.questions)), [goals, board]);
  const composerTasks = useMemo(
    () => composerGoals.map((goal) => goalTask(goal, board.questions)),
    [composerGoals, board],
  );
  // Rows are rebuilt tasks with fresh ids, so the link is looked up by row rather than read off the goal.
  const taskUrls = useMemo(
    () => new Map(composerTasks.map((task, index) => [task.id, composerGoals[index].taskUrl])),
    [composerTasks, composerGoals],
  );
  const getTaskActions = useCallback(
    (task: Task.Task) => {
      const url = taskUrls.get(task.id);
      return url
        ? [
            createMenuAction(`open-${task.id}`, () => window.open(url, '_blank', 'noopener'), {
              label: 'Open in Composer',
              icon: 'ph--arrow-square-out--regular',
              testId: 'board.task.open',
            }),
          ]
        : [];
    },
    [taskUrls],
  );
  const entries = useMemo(() => historyEntries(board.timeline), [board]);
  const open = board.questions.filter((question) => !question.answer);
  const done = goals.filter((goal) => goal.status === 'done').length;
  const composerDone = composerGoals.filter((goal) => goal.status === 'done').length;

  return (
    <Panel.Root size='sm' gutter='rail'>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Layout.Container gap='xl'>
              <Layout.Flex column gap='xs'>
                <Layout.Flex gap='sm' align='center' justify='between'>
                  <Typography.Text asChild truncate>
                    <h1 className='text-lg font-medium'>{board.title}</h1>
                  </Typography.Text>
                  <Typography.Text tone='subtle' classNames='text-xs shrink-0' data-testid='updated'>
                    Updated {updated}
                  </Typography.Text>
                </Layout.Flex>
                {board.summary && <Typography.Text tone='muted'>{board.summary}</Typography.Text>}
              </Layout.Flex>
              <Section
                id='questions'
                icon='ph--question--regular'
                label='Questions'
                count={open.length > 0 ? `${open.length} open` : undefined}
              >
                {board.questions.length === 0 ? (
                  <Typography.Text tone='muted'>No questions now.</Typography.Text>
                ) : (
                  <Layout.Container gap='sm'>
                    {[...open, ...board.questions.filter((question) => question.answer)].map((question) => (
                      <TaskQuestion
                        key={question.id}
                        thread={{
                          question: {
                            text: `${question.id} ${plain(question.text)}`,
                            ...(question.context ? { context: plain(question.context) } : {}),
                            options: question.options,
                          },
                          ...(question.answer ? { answer: { answer: plain(question.answer) } } : {}),
                        }}
                      />
                    ))}
                  </Layout.Container>
                )}
              </Section>
              {composerTasks.length > 0 && (
                <Section
                  id='tasks'
                  icon='ph--check-circle--regular'
                  label='Tasks'
                  count={`${composerDone}/${composerGoals.length}`}
                >
                  {/* The theme shows row buttons only on hover; here the one button is the way into Composer, so it stays visible. */}
                  <div className='contents [&_.dx-tree-item-actions>*]:opacity-100!'>
                    <TaskList.Root
                      tasks={composerTasks}
                      columns={['status', 'title', 'actions']}
                      getTaskActions={getTaskActions}
                      showMnemonics={false}
                      showDescription
                      flush
                    >
                      <TaskList.Viewport>
                        <TaskList.Content />
                      </TaskList.Viewport>
                    </TaskList.Root>
                  </div>
                </Section>
              )}
              <Section id='goals' icon='ph--target--regular' label='Goals' count={`${done}/${goals.length}`}>
                <TaskList.Root tasks={tasks} columns={['status', 'title']} showMnemonics={false} showDescription flush>
                  <TaskList.Viewport>
                    <TaskList.Content />
                  </TaskList.Viewport>
                </TaskList.Root>
              </Section>
              <Section id='prs' icon='ph--git-pull-request--regular' label='Pull requests'>
                {board.prs.length === 0 ? (
                  <Typography.Text tone='muted'>No pull requests yet.</Typography.Text>
                ) : (
                  <PrRows prs={board.prs} landing={landing} onLandChange={onLandChange} />
                )}
              </Section>
              <Section id='timeline' icon='ph--clock--regular' label='Timeline'>
                <TaskHistory entries={entries} limit={entries.length} />
              </Section>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
