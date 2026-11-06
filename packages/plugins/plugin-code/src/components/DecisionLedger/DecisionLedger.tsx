//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { TaskQuestion } from '@dxos/react-ui-task';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Banner from '@dxos/react-ui/Banner';
import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Select from '@dxos/react-ui/Select';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';

import { CodeNamespace } from '../../namespace.ts';
import {
  ActorAvatar,
  type DecisionModel,
  type QuestionModel,
  awaitsApproval,
  buildChangelogGraph,
  buildQuestions,
  holds,
} from '../ChangelogGraph/index.ts';
import { ApproveButton, type ApproveButtonProps, DecisionCard } from './DecisionCard.tsx';
import {
  type LedgerBlock,
  type LedgerFilter,
  type LedgerStatus,
  type LedgerThread,
  NO_BLOCK,
  ledgerBlocks,
  ledgerDays,
  ledgerDecisions,
  ledgerThreads,
  matchesFilter,
  unapprovedIds,
} from './ledger.ts';

/** How deep the ledger is drilled: the whole spec, one block, or one thread of a block. */
type Level = { block?: string; thread?: string };

const STATUSES: LedgerStatus[] = ['holds', 'replaced', 'unapproved', 'questions'];

const isStatus = (value: string): value is LedgerStatus => STATUSES.some((status) => status === value);

/** How many decision rows a block's card previews. */
const PREVIEW = 2;

export type DecisionLedgerProps = {
  /** The text of a `.mdl` spec; only its `## Changelog` is read. */
  content: string;
  /** A decision whose thread opens, or a question the ledger lists. */
  selected?: string;
  /** Records a person's approval of agent decisions; without it there are no approve actions. */
  onApprove?: ApproveButtonProps['onApprove'];
  /** Records an answer to an open question as a decision; without it questions are read-only. */
  onAnswer?: (question: string, answer: string) => void;
  /** Shows a block in the spec. */
  onShowBlock?: (block: string) => void;
};

/**
 * A spec's decisions as a ledger of what holds, drilled down a level at a time like the Definitions canvas: a card per
 * block the decisions affect, then the threads of one block, then one thread by day. Every level filters by status,
 * decider and text, and approves the agent decisions it shows.
 */
export const DecisionLedger = ({ content, selected, onApprove, onAnswer, onShowBlock }: DecisionLedgerProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const graph = useMemo(() => buildChangelogGraph(content), [content]);
  const decisions = useMemo(() => ledgerDecisions(graph), [graph]);
  const questions = useMemo(() => buildQuestions(content), [content]);
  const [filter, setFilter] = useState<LedgerFilter>({ status: 'holds' });
  const [level, setLevel] = useState<Level>({});
  const blocks = useMemo(() => ledgerBlocks(decisions, filter), [decisions, filter]);
  const block = level.block === undefined ? undefined : blocks.find(({ label }) => label === level.block);
  const threads = useMemo(() => (block ? ledgerThreads(block.decisions) : []), [block]);
  const thread = level.thread === undefined ? undefined : threads.find(({ id }) => id === level.thread);
  // The level as drawn: a block or thread the spec no longer has (another spec, an edit) falls back to the level above.
  const shown: Level = { block: block?.label, thread: thread?.id };

  // A decision picked elsewhere (a margin chip, At cursor) opens its thread once; the reader then moves freely.
  const [followed, setFollowed] = useState<string>();
  if (selected !== followed) {
    setFollowed(selected);
    const decision = decisions.find(({ id }) => id === selected);
    if (decision) {
      const label = decision.entry.affects[0] ?? NO_BLOCK;
      const owner = ledgerBlocks(decisions, filter).find((candidate) => candidate.label === label);
      const found = owner && ledgerThreads(owner.decisions).find(({ decisions }) => decisions.includes(decision));
      setLevel({ block: label, thread: found?.id });
    } else if (questions.some(({ id }) => id === selected)) {
      setFilter((current) => ({ ...current, status: 'questions' }));
      setLevel({});
    }
  }

  const deciders = useMemo(
    () => [...new Set(decisions.flatMap(({ handle }) => (handle ? [handle] : [])))].sort(),
    [decisions],
  );
  const counts: Record<LedgerStatus, number> = {
    holds: decisions.filter(holds).length,
    replaced: decisions.filter((decision) => !holds(decision)).length,
    unapproved: decisions.filter(awaitsApproval).length,
    questions: questions.filter(({ answer }) => !answer).length,
  };

  if (decisions.length === 0 && questions.length === 0) {
    return (
      <Status.Empty classNames='dx-fill' data-testid='decision-ledger.empty'>
        {t('decision-ledger.empty.message')}
      </Status.Empty>
    );
  }

  return (
    <Layout.Flex column classNames='dx-fill' data-testid='decision-ledger' data-level={levelName(shown)}>
      <Layout.Flex column gap='sm' classNames='p-2 border-b border-separator'>
        <Layout.Flex gap='sm'>
          <Input.Root
            classNames='grow'
            placeholder={t('decision-ledger.search.placeholder')}
            aria-label={t('decision-ledger.search.placeholder')}
            value={filter.text ?? ''}
            onChange={(event) => setFilter((current) => ({ ...current, text: event.target.value }))}
            data-testid='decision-ledger.search'
          />
          <Select.Root
            items={[
              { value: '', label: t('decision-ledger.anyone.label') },
              ...deciders.map((handle) => ({ value: handle, label: handle })),
            ]}
            value={[filter.decider ?? '']}
            onValueChange={({ value: [value] }) =>
              setFilter((current) => ({ ...current, decider: value || undefined }))
            }
          >
            <Select.Trigger aria-label={t('decision-ledger.decider.label')} data-testid='decision-ledger.decider' />
            <Select.Content>
              <Select.Item item={{ value: '', label: t('decision-ledger.anyone.label') }} />
              {deciders.map((handle) => (
                <Select.Item key={handle} item={{ value: handle, label: handle }} />
              ))}
            </Select.Content>
          </Select.Root>
        </Layout.Flex>
        <ToggleGroup.Root
          type='single'
          value={filter.status}
          onValueChange={(value) => isStatus(value) && setFilter((current) => ({ ...current, status: value }))}
          aria-label={t('decision-ledger.status.label')}
        >
          {STATUSES.map((status) => (
            <ToggleGroup.Item
              key={status}
              value={status}
              label={t(`decision-ledger.status.${status}.label`, { count: counts[status] })}
              data-testid={`decision-ledger.status.${status}`}
            />
          ))}
        </ToggleGroup.Root>
      </Layout.Flex>
      <ScrollArea.Root orientation='vertical' classNames='dx-grow'>
        <ScrollArea.Viewport>
          <Layout.Flex column gap='md' classNames='p-2'>
            {filter.status === 'questions' ? (
              <QuestionList questions={questions} selected={selected} onAnswer={onAnswer} />
            ) : (
              <>
                <Trail level={shown} block={block} thread={thread} onLevel={setLevel} />
                {thread ? (
                  <ThreadLevel thread={thread} selected={selected} onApprove={onApprove} />
                ) : block ? (
                  <BlockLevel
                    block={block}
                    threads={threads.filter(({ decisions }) =>
                      decisions.some((decision) => matchesFilter(decision, filter)),
                    )}
                    onOpen={(id) => setLevel({ block: block.label, thread: id })}
                    onApprove={onApprove}
                    onShowBlock={onShowBlock}
                  />
                ) : (
                  <SpecLevel
                    blocks={blocks}
                    unapproved={unapprovedIds(decisions)}
                    onOpen={(label) => setLevel({ block: label })}
                    onApprove={onApprove}
                  />
                )}
              </>
            )}
          </Layout.Flex>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Layout.Flex>
  );
};

const levelName = ({ block, thread }: Level) => (thread ? 'thread' : block !== undefined ? 'block' : 'spec');

const useBlockLabel = () => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  return (label: string) => (label === NO_BLOCK ? t('decision-ledger.no-block.label') : label);
};

type TrailProps = { level: Level; block?: LedgerBlock; thread?: LedgerThread; onLevel: (level: Level) => void };

/** The path back up, as the Definitions canvas has. */
const Trail = ({ level, block, thread, onLevel }: TrailProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const blockLabel = useBlockLabel();
  const steps = [
    { label: t('decision-ledger.root.label'), level: {} },
    ...(block ? [{ label: blockLabel(block.label), level: { block: block.label } }] : []),
    ...(thread ? [{ label: thread.title, level }] : []),
  ];
  return (
    <Breadcrumb.Root aria-label={t('decision-ledger.trail.label')} data-testid='decision-ledger.trail'>
      <Breadcrumb.List>
        {steps.map((step, index) =>
          index === steps.length - 1 ? (
            <Breadcrumb.Item key={index}>
              <Breadcrumb.Current classNames='truncate'>{step.label}</Breadcrumb.Current>
            </Breadcrumb.Item>
          ) : (
            <React.Fragment key={index}>
              <Breadcrumb.Item>
                <Breadcrumb.Link asChild>
                  <button type='button' onClick={() => onLevel(step.level)}>
                    {step.label}
                  </button>
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
            </React.Fragment>
          ),
        )}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};

type ApprovalBannerProps = {
  ids: readonly string[];
  onApprove: ApproveButtonProps['onApprove'];
  /** Asks before approving, for a whole spec's worth. */
  confirm?: boolean;
};

/** Says how many agent decisions here await approval, and approves them all. */
const ApprovalBanner = ({ ids, onApprove, confirm = false }: ApprovalBannerProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const label = t('decision-ledger.approve-all.label', { count: ids.length });
  return (
    <Banner.Root valence='warning' data-testid='decision-ledger.unapproved'>
      <Banner.Title>{t('decision-ledger.unapproved.message', { count: ids.length })}</Banner.Title>
      <Banner.Body>
        {confirm ? (
          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <Button.Root
                variant='valence'
                icon='ph--seal-check--regular'
                label={label}
                data-testid='decision-ledger.approve-all'
              />
            </AlertDialog.Trigger>
            <AlertDialog.Content data-testid='decision-ledger.confirm'>
              <AlertDialog.Header>
                <AlertDialog.Title>{t('decision-ledger.confirm.title', { count: ids.length })}</AlertDialog.Title>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <AlertDialog.Description>{t('decision-ledger.confirm.message')}</AlertDialog.Description>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <AlertDialog.Cancel>{t('decision-ledger.confirm.cancel')}</AlertDialog.Cancel>
                <AlertDialog.Action onClick={() => onApprove(ids)} data-testid='decision-ledger.confirm.approve'>
                  {label}
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
        ) : (
          <ApproveButton ids={ids} onApprove={onApprove} variant='valence' />
        )}
      </Banner.Body>
    </Banner.Root>
  );
};

const DecisionRow = ({ decision }: { decision: DecisionModel }) => (
  <Card.Row
    leading={<ActorAvatar actor={decision.actor} handle={decision.handle} />}
    trailing={<Tag.Tag classNames='font-mono'>{decision.id}</Tag.Tag>}
  >
    <Card.Text truncate>{decision.entry.title}</Card.Text>
  </Card.Row>
);

type SpecLevelProps = {
  blocks: LedgerBlock[];
  unapproved: string[];
  onOpen: (label: string) => void;
  onApprove?: ApproveButtonProps['onApprove'];
};

const SpecLevel = ({ blocks, unapproved, onOpen, onApprove }: SpecLevelProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const blockLabel = useBlockLabel();
  const shown = blocks.filter(({ matching }) => matching.length > 0);
  return (
    <>
      {onApprove && unapproved.length > 0 && <ApprovalBanner ids={unapproved} onApprove={onApprove} confirm />}
      {shown.length === 0 ? (
        <Status.Empty data-testid='decision-ledger.none'>{t('decision-ledger.none.message')}</Status.Empty>
      ) : (
        shown.map((block) => {
          const ids = unapprovedIds(block.decisions);
          return (
            <Card.Root
              key={block.label}
              onClick={() => onOpen(block.label)}
              data-testid='decision-ledger.block'
              data-block={block.label}
            >
              <Card.Header>
                <Card.Title truncate classNames='font-mono'>
                  {blockLabel(block.label)}
                </Card.Title>
                {onApprove && ids.length > 0 && <ApproveButton ids={ids} onApprove={onApprove} />}
              </Card.Header>
              {block.matching.slice(0, PREVIEW).map((decision) => (
                <DecisionRow key={decision.id} decision={decision} />
              ))}
              <Card.Footer justify='start'>
                <Card.Text variant='muted'>
                  {[
                    t('decision-ledger.decisions.label', { count: block.decisions.length }),
                    t('decision-ledger.threads.label', { count: ledgerThreads(block.decisions).length }),
                  ].join(' · ')}
                </Card.Text>
              </Card.Footer>
            </Card.Root>
          );
        })
      )}
    </>
  );
};

type BlockLevelProps = {
  block: LedgerBlock;
  threads: LedgerThread[];
  onOpen: (thread: string) => void;
  onApprove?: ApproveButtonProps['onApprove'];
  onShowBlock?: (block: string) => void;
};

const BlockLevel = ({ block, threads, onOpen, onApprove, onShowBlock }: BlockLevelProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const unapproved = unapprovedIds(block.decisions);
  return (
    <>
      <Layout.Flex align='center' gap='sm'>
        <Card.Text variant='muted' classNames='grow'>
          {[
            t('decision-ledger.decisions.label', { count: block.decisions.length }),
            t('decision-ledger.threads.label', { count: threads.length }),
          ].join(' · ')}
        </Card.Text>
        {onShowBlock && block.label !== NO_BLOCK && (
          <Button.Root
            variant='ghost'
            icon='ph--text-align-left--regular'
            label={t('decision-ledger.show-in-spec.label')}
            onClick={() => onShowBlock(block.label)}
            data-testid='decision-ledger.show-in-spec'
          />
        )}
      </Layout.Flex>
      {onApprove && unapproved.length > 0 && <ApprovalBanner ids={unapproved} onApprove={onApprove} />}
      {threads.length === 0 ? (
        <Status.Empty data-testid='decision-ledger.none'>{t('decision-ledger.none.message')}</Status.Empty>
      ) : (
        threads.map((thread) => {
          const ids = unapprovedIds(thread.decisions);
          const newest = thread.decisions[thread.decisions.length - 1];
          return (
            <Card.Root
              key={thread.id}
              onClick={() => onOpen(thread.id)}
              data-testid='decision-ledger.thread'
              data-thread={thread.id}
            >
              <Card.Header>
                <Card.Title lines={2}>{thread.title}</Card.Title>
                {onApprove && ids.length > 0 && <ApproveButton ids={ids} onApprove={onApprove} />}
              </Card.Header>
              <DecisionRow decision={newest} />
              <Card.Footer justify='start'>
                <Layout.Flex wrap gap='xs'>
                  {thread.decisions.map(({ id, supersededBy }) => (
                    <Tag.Tag key={id} classNames={['font-mono', supersededBy && 'line-through']}>
                      {id}
                    </Tag.Tag>
                  ))}
                </Layout.Flex>
              </Card.Footer>
            </Card.Root>
          );
        })
      )}
    </>
  );
};

type ThreadLevelProps = {
  thread: LedgerThread;
  selected?: string;
  onApprove?: ApproveButtonProps['onApprove'];
};

/** One thread: whether it awaits approval, what of it holds now, then how it got there, day by day. */
const ThreadLevel = ({ thread, selected, onApprove }: ThreadLevelProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const unapproved = unapprovedIds(thread.decisions);
  const live = [...thread.decisions].filter(holds).reverse();
  const days = useMemo(() => ledgerDays(thread), [thread]);
  return (
    <>
      {onApprove && unapproved.length > 0 && <ApprovalBanner ids={unapproved} onApprove={onApprove} />}
      <Card.Root data-testid='decision-ledger.holds-now'>
        <Card.Section title={t('decision-ledger.holds-now.label')}>
          {live.map((decision) => (
            <DecisionRow key={decision.id} decision={decision} />
          ))}
        </Card.Section>
      </Card.Root>
      {days.map((day) => (
        <Layout.Flex key={day.date ?? ''} column gap='sm' data-testid='decision-ledger.day' data-date={day.date}>
          <Card.Text variant='muted'>{day.date ?? t('decision-ledger.no-date.label')}</Card.Text>
          {day.steps.map((step) => (
            <DecisionCard key={step[0].id} decisions={step} selected={selected} onApprove={onApprove} />
          ))}
        </Layout.Flex>
      ))}
    </>
  );
};

type QuestionListProps = Pick<DecisionLedgerProps, 'selected' | 'onAnswer'> & { questions: QuestionModel[] };

/** The changelog's questions, open ones first, each answered as the chat answers an agent's question. */
const QuestionList = ({ questions, selected, onAnswer }: QuestionListProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  if (questions.length === 0) {
    return <Status.Empty data-testid='decision-ledger.none'>{t('decision-ledger.no-questions.message')}</Status.Empty>;
  }
  return (
    <>
      {questions.map((question) => (
        <QuestionCard key={question.id} question={question} selected={question.id === selected} onAnswer={onAnswer} />
      ))}
    </>
  );
};

type QuestionCardProps = Pick<DecisionLedgerProps, 'onAnswer'> & { question: QuestionModel; selected: boolean };

export const QuestionCard = ({ question: { entry, actor, handle, answer }, selected, onAnswer }: QuestionCardProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const thread = useMemo(
    () => ({
      question: { text: entry.title, context: entry.context, options: entry.options },
      answer: answer && { answer: answer.entry.title },
    }),
    [entry, answer],
  );
  return (
    <Card.Root
      selected={selected}
      data-testid='decision-ledger.question'
      data-question={entry.id}
      data-answered={answer ? '' : undefined}
    >
      <Card.Row
        leading={<ActorAvatar actor={actor} handle={handle} />}
        trailing={
          answer ? (
            <Tag.Tag hue='success'>{t('changelog-graph.question.answered-in.label', { id: answer.id })}</Tag.Tag>
          ) : (
            <Tag.Tag hue='warning'>{t('changelog-graph.question.open.label')}</Tag.Tag>
          )
        }
      >
        <Card.Text truncate variant='muted'>
          {[entry.id, handle ?? t('changelog-graph.unknown-actor.label'), entry.date].filter(Boolean).join(' · ')}
        </Card.Text>
      </Card.Row>
      {/* The chat's question component, so a spec question reads and answers like one an agent asks in a thread. */}
      <TaskQuestion thread={thread} onAnswer={onAnswer && ((text) => onAnswer(entry.id, text))} />
    </Card.Root>
  );
};
