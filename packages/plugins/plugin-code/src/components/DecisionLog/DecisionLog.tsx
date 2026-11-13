//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { TaskQuestion } from '@dxos/react-ui-task';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Listbox from '@dxos/react-ui/Listbox';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import {
  ACTOR_STYLE,
  ActorAvatar,
  type DeciderGroup,
  type DecisionModel,
  type QuestionModel,
  buildChangelogGraph,
  buildQuestions,
  groupByDecider,
} from '../ChangelogGraph/index.ts';

/** The id column fits `D-99` and an ISO date on two lines. */
const ROW_COLUMNS = ['4rem', 'fill'] as const;

type DecisionRowProps = { decision: DecisionModel; item: Listbox.Option; selected: boolean };

const DecisionRow = ({ decision, item, selected }: DecisionRowProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { entry, actor, principal, supersededBy, approvedBy } = decision;
  const reason = actor === 'user' ? (entry.quote ?? entry.why) : entry.why;
  return (
    <Listbox.Item
      item={item}
      current={selected}
      classNames={supersededBy && 'opacity-60'}
      data-testid='decision-log.decision'
      data-decision={entry.id}
      data-selected={selected ? '' : undefined}
    >
      <Layout.Grid cols={ROW_COLUMNS} gap='md' classNames='col-span-full px-3 py-1'>
        <Layout.Flex column>
          <span className='font-mono text-sm'>{entry.id}</span>
          {entry.date && <span className='text-xs text-description'>{entry.date}</span>}
        </Layout.Flex>
        <Layout.Flex column gap='xs' classNames='min-w-0'>
          <span className={mx(supersededBy && 'line-through')}>{entry.title}</span>
          {reason && (
            <span className={mx('text-sm text-description line-clamp-2', entry.quote && actor === 'user' && 'italic')}>
              {reason}
            </span>
          )}
          {(principal || supersededBy || approvedBy.length > 0 || entry.affects.length > 0) && (
            <Layout.Flex wrap gap='xs'>
              {principal && (
                <Tag.Tag hue={ACTOR_STYLE.user.hue}>
                  <Icon.Icon icon='ph--user-focus--regular' size='xs' />
                  {t('changelog-graph.for.label', { principal })}
                </Tag.Tag>
              )}
              {supersededBy && (
                <Tag.Tag hue='error'>{t('changelog-graph.superseded-by.label', { id: supersededBy })}</Tag.Tag>
              )}
              {approvedBy.length > 0 && (
                <Tag.Tag hue='success'>
                  {t('changelog-graph.approved-in.label', { ids: approvedBy.join(', ') })}
                </Tag.Tag>
              )}
              {entry.affects.map((block) => (
                <Tag.Tag key={block} classNames='font-mono'>
                  {block}
                </Tag.Tag>
              ))}
            </Layout.Flex>
          )}
        </Layout.Flex>
      </Layout.Grid>
    </Listbox.Item>
  );
};

const DeciderSection = ({ group, selected }: { group: DeciderGroup; selected?: string }) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const style = group.actor ? ACTOR_STYLE[group.actor] : undefined;
  const items = useMemo(
    () => group.decisions.map(({ entry }) => ({ value: entry.id, label: entry.title })),
    [group.decisions],
  );
  return (
    <section
      className={mx('rounded-md bg-card-surface', style?.frame ?? 'border border-separator')}
      data-testid='decision-log.decider'
      data-actor={group.actor}
      data-handle={group.handle}
    >
      <Layout.Flex asChild align='center' gap='sm' classNames='px-3 py-2 border-b border-separator'>
        <header>
          <ActorAvatar actor={group.actor} handle={group.handle} />
          <span className='font-medium truncate'>{group.handle ?? t('changelog-graph.unknown-actor.label')}</span>
          {style && group.actor && (
            <Tag.Tag hue={style.hue}>
              <Icon.Icon icon={style.icon} size='xs' />
              {t(`changelog-graph.actor.${group.actor}.label`)}
            </Tag.Tag>
          )}
          <span className='grow' />
          <Tag.Tag>{t('decision-log.count.label', { count: group.decisions.length })}</Tag.Tag>
        </header>
      </Layout.Flex>
      <Listbox.Root items={items} selectionMode='none'>
        <Listbox.Content aria-label={group.handle ?? t('changelog-graph.unknown-actor.label')}>
          {group.decisions.map((decision, index) => (
            <DecisionRow
              key={decision.id}
              decision={decision}
              item={items[index]}
              selected={decision.id === selected}
            />
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </section>
  );
};

type QuestionItemProps = Pick<DecisionLogProps, 'onAnswer'> & { question: QuestionModel; selected: boolean };

const QuestionItem = ({ question: { entry, actor, handle, answer }, selected, onAnswer }: QuestionItemProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const thread = useMemo(
    () => ({
      question: { text: entry.title, context: entry.context, options: entry.options },
      answer: answer && { answer: answer.entry.title },
    }),
    [entry, answer],
  );
  return (
    <li
      className={mx('flex flex-col gap-2 px-3 py-2', selected && 'bg-current-surface')}
      data-testid='decision-log.question'
      data-question={entry.id}
      data-answered={answer ? '' : undefined}
    >
      <Layout.Flex align='center' gap='sm' classNames='min-w-0'>
        <ActorAvatar actor={actor} handle={handle} />
        <span className='font-mono text-sm'>{entry.id}</span>
        <span className='text-xs text-description truncate'>
          {[handle ?? t('changelog-graph.unknown-actor.label'), entry.date].filter(Boolean).join(' · ')}
        </span>
        <span className='grow' />
        {answer ? (
          <Tag.Tag hue='success'>{t('changelog-graph.question.answered-in.label', { id: answer.id })}</Tag.Tag>
        ) : (
          <Tag.Tag hue='warning'>{t('changelog-graph.question.open.label')}</Tag.Tag>
        )}
      </Layout.Flex>
      {/* The chat's question component, so a spec question reads and answers like one an agent asks in a thread. */}
      <TaskQuestion thread={thread} onAnswer={onAnswer && ((text) => onAnswer(entry.id, text))} />
    </li>
  );
};

const QuestionSection = ({
  questions,
  selected,
  onAnswer,
}: Pick<DecisionLogProps, 'onAnswer' | 'selected'> & { questions: QuestionModel[] }) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const open = questions.filter(({ answer }) => !answer).length;
  return (
    <section className='rounded-md bg-card-surface border-2 border-warning-border' data-testid='decision-log.questions'>
      <Layout.Flex asChild align='center' gap='sm' classNames='px-3 py-2 border-b border-separator'>
        <header>
          <Icon.Icon icon='ph--question--regular' />
          <span className='font-medium'>{t('decision-log.questions.label')}</span>
          <span className='grow' />
          {open > 0 && <Tag.Tag hue='warning'>{t('decision-log.questions.open.label', { count: open })}</Tag.Tag>}
        </header>
      </Layout.Flex>
      <ul className='divide-y divide-separator'>
        {questions.map((question) => (
          <QuestionItem key={question.id} question={question} selected={question.id === selected} onAnswer={onAnswer} />
        ))}
      </ul>
    </section>
  );
};

export type DecisionLogProps = {
  /** The text of a `.mdl` spec; only its `## Changelog` is listed. */
  content: string;
  /** A decision or question id whose row is highlighted. */
  selected?: string;
  /** Records an answer to an open question as a decision; without it questions are read-only. */
  onAnswer?: (question: string, answer: string) => void;
};

/**
 * A spec's `## Changelog` as a log grouped by decider: the questions first, open ones on top, then one section per
 * person, then per agent at the bottom, each listing that decider's decisions in the order they were made.
 */
export const DecisionLog = ({ content, selected, onAnswer }: DecisionLogProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const groups = useMemo(
    () =>
      groupByDecider(
        buildChangelogGraph(content).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
      ),
    [content],
  );
  const questions = useMemo(() => buildQuestions(content), [content]);

  if (groups.length === 0 && questions.length === 0) {
    return (
      <Status.Empty classNames='dx-fill' data-testid='decision-log.empty'>
        {t('decision-log.empty.message')}
      </Status.Empty>
    );
  }

  return (
    <ScrollArea.Root orientation='vertical' classNames='dx-fill' data-testid='decision-log'>
      <ScrollArea.Viewport>
        <Layout.Flex column gap='lg' classNames='p-4'>
          {questions.length > 0 && <QuestionSection questions={questions} selected={selected} onAnswer={onAnswer} />}
          {groups.map((group) => (
            <DeciderSection key={`${group.actor}:${group.handle}`} group={group} selected={selected} />
          ))}
        </Layout.Flex>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
