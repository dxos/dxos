//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import { TaskHistory, TaskList, TaskQuestion } from '@dxos/react-ui-task';
import * as Accordion from '@dxos/react-ui/Accordion';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { Tag, type TagHue } from '@dxos/react-ui/Tag';
import * as Typography from '@dxos/react-ui/Typography';
import { Task } from '@dxos/types';

import { type BoardData, type Goal, type PrStatus, type PullRequest, type TimelineEvent } from './types.ts';

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

const SectionTrigger = ({ icon, label, count }: { icon: string; label: string; count?: string }) => (
  <Accordion.ItemTrigger icon={icon}>
    {label}
    {count && (
      <Typography.Text asChild tone='muted'>
        <span> · {count}</span>
      </Typography.Text>
    )}
  </Accordion.ItemTrigger>
);

const PrRows = ({ prs }: { prs: PullRequest[] }) => (
  <Listbox.Root items={prs.map((pr) => ({ value: pr.id, label: pr.title, description: pr.branch }))}>
    <Listbox.Viewport>
      <Listbox.Content>
        {prs.map((pr) => (
          <Listbox.Item key={pr.id} id={pr.id} data-testid={`pr-${pr.id}`}>
            <Listbox.ItemIcon icon={PR_ICONS[pr.status]} />
            <Listbox.ItemText>
              <Typography.Link href={pr.url}>{pr.ref}</Typography.Link> {plain(pr.title)}
            </Listbox.ItemText>
            {pr.branch && <Listbox.ItemDescription>{pr.branch}</Listbox.ItemDescription>}
            <Tag hue={PR_HUES[pr.status]}>{pr.status}</Tag>
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Viewport>
  </Listbox.Root>
);

export type BoardProps = { board: BoardData };

/**
 * The session board: open questions, goals as a task list, pull requests and the append-only timeline, each an
 * accordion section, with when it was built in the footer.
 */
export const Board = ({ board }: BoardProps) => {
  const updated = Typography.useRelativeTime(board.updated);
  const tasks = useMemo(() => board.goals.map((goal) => goalTask(goal, board.questions)), [board]);
  const entries = useMemo(() => historyEntries(board.timeline), [board]);
  const open = board.questions.filter((question) => !question.answer);
  const done = board.goals.filter((goal) => goal.status === 'done').length;
  const sections = ['questions', 'goals', 'prs', 'timeline'];

  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Layout.Container gap='md'>
              <Layout.Flex column gap='xs'>
                <Typography.Text asChild>
                  <h1>{board.title}</h1>
                </Typography.Text>
                {board.summary && <Typography.Text tone='muted'>{board.summary}</Typography.Text>}
              </Layout.Flex>
              <Accordion.Root border={false} defaultValue={sections}>
                <Accordion.Item value='questions' data-testid='section-questions'>
                  <SectionTrigger
                    icon='ph--question--regular'
                    label='Questions'
                    count={open.length > 0 ? `${open.length} open` : undefined}
                  />
                  <Accordion.ItemContent>
                    {board.questions.length === 0 ? (
                      <Typography.Text tone='muted'>No questions now.</Typography.Text>
                    ) : (
                      <Layout.Container gap='md'>
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
                  </Accordion.ItemContent>
                </Accordion.Item>

                <Accordion.Item value='goals' data-testid='section-goals'>
                  <SectionTrigger icon='ph--target--regular' label='Goals' count={`${done}/${board.goals.length}`} />
                  <Accordion.ItemContent>
                    <TaskList.Root tasks={tasks} columns={['status', 'title']} showMnemonics={false} showDescription>
                      <TaskList.Viewport>
                        <TaskList.Content />
                      </TaskList.Viewport>
                    </TaskList.Root>
                  </Accordion.ItemContent>
                </Accordion.Item>

                <Accordion.Item value='prs' data-testid='section-prs'>
                  <SectionTrigger icon='ph--git-pull-request--regular' label='Pull requests' />
                  <Accordion.ItemContent>
                    {board.prs.length === 0 ? (
                      <Typography.Text tone='muted'>No pull requests yet.</Typography.Text>
                    ) : (
                      <PrRows prs={board.prs} />
                    )}
                  </Accordion.ItemContent>
                </Accordion.Item>

                <Accordion.Item value='timeline' data-testid='section-timeline'>
                  <SectionTrigger icon='ph--clock--regular' label='Timeline' />
                  <Accordion.ItemContent>
                    <TaskHistory entries={entries} limit={entries.length} />
                  </Accordion.ItemContent>
                </Accordion.Item>
              </Accordion.Root>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer>
        <Typography.Text tone='subtle' data-testid='updated'>
          Updated {updated}
        </Typography.Text>
      </Panel.Footer>
    </Panel.Root>
  );
};
