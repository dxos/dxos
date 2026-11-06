//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { ActorAvatar, type DecisionModel, buildChangelogGraph } from '../ChangelogGraph/index.ts';
import { type DecisionThread, type RailRow, threadsOf } from './thread-rail.ts';

/** Width (px) of one lane of the rail. */
const LANE = 14;

/** Height (px) of a row's dot from its top, level with the first line of text. */
const DOT_Y = 14;

/** One colour per lane, so a line can be followed down the rail. */
const LANE_COLOR = ['bg-sky-border', 'bg-violet-border', 'bg-amber-border', 'bg-emerald-border', 'bg-rose-border'];

const laneColor = (lane: number) => LANE_COLOR[lane % LANE_COLOR.length];

const laneX = (lane: number) => lane * LANE + LANE / 2;

/** The rail beside one row: a dot in its lane, lines through, into and out of it, and the joins between lanes. */
const Rail = ({ row, lanes, selected }: { row: RailRow; lanes: number; selected: boolean }) => {
  const join = (lane: number) =>
    lane !== row.lane && (
      <div
        key={`join-${lane}`}
        className={mx('absolute h-0.5', laneColor(lane))}
        style={{
          top: DOT_Y - 1,
          left: Math.min(laneX(lane), laneX(row.lane)),
          width: Math.abs(laneX(lane) - laneX(row.lane)),
        }}
      />
    );
  const line = (lane: number, top: number | string, bottom: number | string, key: string) => (
    <div key={key} className={mx('absolute w-0.5', laneColor(lane))} style={{ left: laneX(lane) - 1, top, bottom }} />
  );
  return (
    <div className='relative shrink-0' style={{ width: lanes * LANE }} aria-hidden>
      {row.through.map((lane) => line(lane, 0, 0, `through-${lane}`))}
      {row.incoming.map((lane) => line(lane, 0, `calc(100% - ${DOT_Y}px)`, `in-${lane}`))}
      {row.outgoing.map((lane) => line(lane, DOT_Y, 0, `out-${lane}`))}
      {row.incoming.map(join)}
      {row.outgoing.map(join)}
      <div
        className={mx('absolute size-2.5 rounded-full', laneColor(row.lane), selected && 'ring-2 ring-accent-text')}
        style={{ top: DOT_Y - 5, left: laneX(row.lane) - 5 }}
      />
    </div>
  );
};

type DecisionRowProps = { decision: DecisionModel; selected: boolean; rail?: { row: RailRow; lanes: number } };

const DecisionRow = ({ decision, selected, rail }: DecisionRowProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { entry, actor, handle, supersededBy, approvedBy } = decision;
  const reason = actor === 'user' ? (entry.quote ?? entry.why) : entry.why;
  return (
    <li
      className={mx('flex gap-2 px-3', selected && 'bg-current-surface', supersededBy && 'opacity-60')}
      data-testid='decision-threads.decision'
      data-decision={entry.id}
      data-selected={selected ? '' : undefined}
    >
      {rail && <Rail row={rail.row} lanes={rail.lanes} selected={selected} />}
      <Layout.Flex column gap='xs' classNames='min-w-0 grow py-1.5'>
        <Layout.Flex align='center' gap='xs' classNames='min-w-0 text-xs text-description'>
          <ActorAvatar actor={actor} handle={handle} />
          <span className='font-mono'>{entry.id}</span>
          <span className='truncate'>
            {[handle ?? t('changelog-graph.unknown-actor.label'), entry.date].filter(Boolean).join(' · ')}
          </span>
        </Layout.Flex>
        <span className={mx('text-sm line-clamp-2', supersededBy && 'line-through')}>{entry.title}</span>
        {reason && (
          <span className={mx('text-xs text-description line-clamp-1', entry.quote && actor === 'user' && 'italic')}>
            {reason}
          </span>
        )}
        {(supersededBy || approvedBy.length > 0 || entry.affects.length > 0) && (
          <Layout.Flex wrap gap='xs'>
            {supersededBy && (
              <Tag.Tag hue='error'>{t('changelog-graph.superseded-by.label', { id: supersededBy })}</Tag.Tag>
            )}
            {approvedBy.length > 0 && (
              <Tag.Tag hue='success'>{t('changelog-graph.approved-in.label', { ids: approvedBy.join(', ') })}</Tag.Tag>
            )}
            {entry.affects.map((block) => (
              <Tag.Tag key={block} classNames='font-mono'>
                {block}
              </Tag.Tag>
            ))}
          </Layout.Flex>
        )}
      </Layout.Flex>
    </li>
  );
};

type ThreadProps = { thread: DecisionThread; open: boolean; onOpenChange: (open: boolean) => void; selected?: string };

/** A thread folded to its newest decision, who took part and when; opened, its decisions on their rail. */
const Thread = ({ thread, open, onOpenChange, selected }: ThreadProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const newest = thread.rows[0].decision;
  const oldest = thread.rows[thread.rows.length - 1].decision;
  const deciders = useMemo(() => {
    const seen = new Map<string, DecisionModel>();
    thread.rows.forEach(({ decision }) => seen.set(`${decision.actor}:${decision.handle}`, decision));
    return [...seen.values()];
  }, [thread]);
  const dates = [oldest.entry.date, newest.entry.date].filter(Boolean);
  return (
    <section
      className='rounded-md bg-card-surface border border-separator'
      data-testid='decision-threads.thread'
      data-thread={thread.id}
      data-open={open ? '' : undefined}
    >
      <button
        type='button'
        className='flex w-full items-start gap-2 px-3 py-2 text-start dx-focus-ring rounded-md'
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        data-testid='decision-threads.toggle'
      >
        <Icon.Icon icon={open ? 'ph--caret-down--regular' : 'ph--caret-right--regular'} classNames='mt-1 shrink-0' />
        <Layout.Flex column gap='xs' classNames='min-w-0 grow'>
          <span className='text-sm font-medium line-clamp-2'>{newest.entry.title}</span>
          <Layout.Flex align='center' gap='xs' wrap classNames='text-xs text-description'>
            <Tag.Tag>{t('decision-log.count.label', { count: thread.rows.length })}</Tag.Tag>
            <span className='font-mono'>
              {oldest.id} – {newest.id}
            </span>
            {dates.length > 0 && <span>{[...new Set(dates)].join(' – ')}</span>}
          </Layout.Flex>
        </Layout.Flex>
        <Layout.Flex classNames='shrink-0 -space-x-1'>
          {deciders.slice(0, 3).map(({ actor, handle }) => (
            <ActorAvatar key={`${actor}:${handle}`} actor={actor} handle={handle} />
          ))}
        </Layout.Flex>
      </button>
      {open && (
        <ul className='border-t border-separator pb-1'>
          {thread.rows.map((row) => (
            <DecisionRow
              key={row.decision.id}
              decision={row.decision}
              selected={row.decision.id === selected}
              rail={{ row, lanes: thread.lanes }}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export type DecisionThreadsProps = {
  /** The text of a `.mdl` spec; only its `## Changelog` is read. */
  content: string;
  /** A decision whose thread opens, scrolled to, with its row highlighted. */
  selected?: string;
};

/**
 * A spec's decisions as threads: each group of decisions that build on, supersede or approve one another, newest
 * thread first and folded to its newest decision. Opening a thread lists its decisions newest first on a rail that
 * draws which builds on which. A decision that stands alone is listed as it is. Superseded decisions are hidden until
 * asked for.
 */
export const DecisionThreads = ({ content, selected }: DecisionThreadsProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const graph = useMemo(() => buildChangelogGraph(content), [content]);
  const selectedDecision = graph.nodes.find(
    (node): node is DecisionModel => node.kind === 'decision' && node.id === selected,
  );
  const [showSuperseded, setShowSuperseded] = useState(false);
  // A superseded decision the spec points at is shown, so selecting it never lands on nothing.
  const superseded = showSuperseded || Boolean(selectedDecision?.supersededBy);
  const threads = useMemo(() => threadsOf(graph, { superseded }), [graph, superseded]);
  const supersededCount = useMemo(() => threads.reduce((sum, thread) => sum + thread.superseded, 0), [threads]);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const selectedThread = threads.find(({ rows }) => rows.some(({ decision }) => decision.id === selected))?.id;

  useEffect(() => {
    selectedThread && setOpened((opened) => new Set(opened).add(selectedThread));
  }, [selectedThread]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const selectedOpen = selectedThread !== undefined && opened.has(selectedThread);
  useEffect(() => {
    selected &&
      viewportRef.current
        ?.querySelector(`[data-decision="${CSS.escape(selected)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [selected, selectedOpen]);

  if (threads.length === 0) {
    return (
      <Status.Empty classNames='dx-fill' data-testid='decision-threads.empty'>
        {t('decision-log.empty.message')}
      </Status.Empty>
    );
  }

  return (
    <Layout.Flex column classNames='dx-fill' data-testid='decision-threads'>
      <Layout.Flex align='center' gap='sm' classNames='px-3 py-1 min-h-[2.5rem] text-sm text-description'>
        <span className='grow'>{t('decision-threads.count.label', { count: threads.length })}</span>
        {supersededCount > 0 && (
          <Input.Switch
            checked={superseded}
            onCheckedChange={({ checked }) => setShowSuperseded(checked)}
            label={t('decision-threads.superseded.label', { count: supersededCount })}
            data-testid='decision-threads.superseded'
          />
        )}
      </Layout.Flex>
      <ScrollArea.Root orientation='vertical' classNames='dx-grow'>
        <ScrollArea.Viewport ref={viewportRef} classNames='px-2 pb-2'>
          <Layout.Flex column gap='sm'>
            {threads.map((thread) =>
              thread.rows.length === 1 ? (
                <ul key={thread.id} className='rounded-md bg-card-surface border border-separator'>
                  <DecisionRow decision={thread.rows[0].decision} selected={thread.rows[0].decision.id === selected} />
                </ul>
              ) : (
                <Thread
                  key={thread.id}
                  thread={thread}
                  open={opened.has(thread.id)}
                  onOpenChange={(open) =>
                    setOpened((opened) => {
                      const next = new Set(opened);
                      open ? next.add(thread.id) : next.delete(thread.id);
                      return next;
                    })
                  }
                  selected={selected}
                />
              ),
            )}
          </Layout.Flex>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Layout.Flex>
  );
};
