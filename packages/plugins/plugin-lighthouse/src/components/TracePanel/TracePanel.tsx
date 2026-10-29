import React, { useCallback, useEffect, useMemo, useState } from 'react';
//
// Copyright 2026 DXOS.org
//

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import { mx } from '@dxos/ui-theme';

import { type ExplainCategory, type ExplainNode } from '../../client/types.ts';
import {
  type TraceSummary,
  allOpen,
  barOf,
  defaultOpen,
  formatCount,
  formatDuration,
  formatTokens,
  formatUsd,
  histogram,
  splitCurie,
  summarize,
  timeOf,
} from '../../model/explain.ts';
import { LighthouseNamespace } from '../../namespace.ts';

const ICONS: Record<string, string> = {
  session: 'ph--tree-structure--regular',
  input: 'ph--chat-text--regular',
  turn: 'ph--brain--regular',
  call: 'ph--wrench--regular',
  command: 'ph--terminal--regular',
  load: 'ph--globe--regular',
  extract: 'ph--funnel--regular',
  model: 'ph--sparkle--regular',
  plan: 'ph--list-checks--regular',
  other: 'ph--dot--regular',
};

/** What ran a row, as colour: the LLM violet, System One teal, tools with no model neutral. */
const CATEGORY_CLASSES: Record<ExplainCategory, { row: string; bar: string; icon: string; swatch: string }> = {
  'llm': {
    row: 'bg-violet-surface/40 shadow-[inset_3px_0_0_var(--color-violet-fg)]',
    bar: 'bg-violet-fg',
    icon: 'text-violet-text',
    swatch: 'bg-violet-fg',
  },
  'system-one': {
    row: 'shadow-[inset_3px_0_0_var(--color-teal-fg)]',
    bar: 'bg-teal-fg',
    icon: 'text-teal-text',
    swatch: 'bg-teal-fg',
  },
  'tool': {
    row: 'shadow-[inset_3px_0_0_var(--color-neutral-fg)]',
    bar: 'bg-neutral-fg',
    icon: 'text-fg-subtle',
    swatch: 'bg-neutral-fg',
  },
};

/** Columns: step, timeline, time, cost, pages, facts, results. */
const COLUMNS = ['minmax(16rem, 1fr)', '8rem', '4.2rem', '4.6rem', '3rem', '3.6rem', '3.4rem'] as const;

const Histogram = ({ title, counts }: { title: string; counts: Record<string, number> }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [all, setAll] = useState(false);
  const rows = histogram(counts);
  const shown = all ? rows : rows.slice(0, 14);
  return (
    <Layout.Flex column gap='xs'>
      <span className='text-xs uppercase tracking-wide text-fg-subtle'>
        {title} · {rows.length}
      </span>
      <Layout.Flex wrap gap='xs'>
        {shown.map(([key, count]) => {
          const [prefix, name] = splitCurie(key);
          return (
            <span
              key={key}
              title={key}
              className='font-mono text-[0.625rem] px-1.5 rounded-full border border-separator bg-base-surface'
            >
              <span className='opacity-55'>{prefix}</span>
              {name} <span className='text-fg-subtle'>{count}</span>
            </span>
          );
        })}
        {rows.length > shown.length && (
          <Button.Root variant='ghost' size='xs' onClick={() => setAll(true)}>
            {t('trace-more.label', { count: rows.length - shown.length })}
          </Button.Root>
        )}
      </Layout.Flex>
    </Layout.Flex>
  );
};

type RowProps = {
  node: ExplainNode;
  depth: number;
  start: number;
  span: number;
  open: ReadonlySet<string>;
  onToggle: (id: string) => void;
};

const Row = ({ node, depth, start, span, open, onToggle }: RowProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const expanded = open.has(node.id);
  const hasDetail = !!(node.predicates || node.types || node.error || node.tokens?.in);
  const canOpen = node.children.length > 0 || hasDetail;
  const bar = barOf(node, start, span);
  const failed = node.ok === false;
  const category = node.category ? CATEGORY_CLASSES[node.category] : undefined;
  const label = node.label;

  return (
    <>
      <Layout.Grid
        cols={COLUMNS}
        gap='sm'
        align='center'
        role='row'
        aria-level={depth + 1}
        aria-expanded={canOpen ? expanded : undefined}
        data-testid='lighthouse.trace.row'
        data-category={node.category}
        data-kind={node.kind}
        classNames={mx(
          'px-3 py-0.5 text-xs tabular-nums border-b border-separator/50 hover:bg-hover-surface',
          category?.row,
        )}
      >
        <Layout.Flex
          gap='xs'
          align='center'
          classNames='min-w-0'
          role='cell'
          style={{ paddingInlineStart: `${depth * 1.1}rem` }}
        >
          {canOpen ? (
            <Button.Root
              variant='ghost'
              size='xs'
              iconOnly
              icon={expanded ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
              label={t(expanded ? 'trace-collapse-row.label' : 'trace-expand-row.label')}
              onClick={() => onToggle(node.id)}
            />
          ) : (
            <span className='w-4 shrink-0' />
          )}
          <Icon.Icon
            icon={ICONS[node.kind] ?? ICONS.other}
            size='sm'
            classNames={mx('shrink-0', category?.icon ?? 'text-fg-subtle')}
          />
          <span
            title={node.label}
            className={mx(
              'truncate min-w-8',
              node.kind === 'input' && 'font-semibold',
              node.kind === 'turn' && 'font-medium',
              (node.kind === 'load' || node.kind === 'command') && 'font-mono text-[0.6875rem]',
              failed && 'text-error-text',
            )}
          >
            {label}
          </span>
          {node.detail && (
            <span title={node.detail} className='truncate min-w-0 flex-1 text-[0.6875rem] text-fg-subtle'>
              {node.detail}
            </span>
          )}
          {failed && <Icon.Icon icon='ph--warning--regular' size='sm' classNames='text-error-text' />}
        </Layout.Flex>
        <span role='cell' aria-hidden='true' className='relative h-2 rounded-sm bg-separator/40 overflow-hidden'>
          {bar && (
            <span
              className={mx('absolute inset-y-0 rounded-sm', failed ? 'bg-rose-fg' : (category?.bar ?? 'bg-blue-fg'))}
              style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
            />
          )}
        </span>
        <span role='cell' className='text-end'>
          {formatDuration(timeOf(node))}
        </span>
        <span role='cell' className='text-end'>
          {formatUsd(node.totalUsd)}
        </span>
        <span role='cell' className='text-end'>
          {formatCount(node.pages)}
        </span>
        <span role='cell' className='text-end'>
          {formatCount(node.facts)}
        </span>
        <span role='cell' className='text-end'>
          {formatCount(node.results)}
        </span>
      </Layout.Grid>
      {expanded && hasDetail && (
        <Layout.Flex
          column
          gap='xs'
          classNames='py-1 pe-3 border-b border-separator bg-group-surface/60 text-xs'
          style={{ paddingInlineStart: `${depth * 1.1 + 3.4}rem` }}
        >
          {node.tokens?.in ? <span className='text-fg-subtle'>{formatTokens(node.tokens)}</span> : null}
          {node.subjects !== undefined && (
            <span className='text-fg-subtle'>{t('trace-subjects.label', { count: node.subjects })}</span>
          )}
          {node.error && <span className='text-error-text whitespace-pre-wrap break-words'>{node.error}</span>}
          {node.types && <Histogram title={t('trace-types.label')} counts={node.types} />}
          {node.predicates && <Histogram title={t('trace-predicates.label')} counts={node.predicates} />}
        </Layout.Flex>
      )}
      {expanded &&
        node.children.map((child) => (
          <Row
            key={child.id}
            node={child}
            depth={depth + 1}
            start={start}
            span={span}
            open={open}
            onToggle={onToggle}
          />
        ))}
    </>
  );
};

const CATEGORIES: ExplainCategory[] = ['llm', 'system-one', 'tool'];

const Summary = ({ tree, summary }: { tree: ExplainNode; summary: TraceSummary }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  return (
    <Layout.Flex wrap gap='md' align='center' classNames='text-xs text-fg-muted'>
      <span>
        {t('trace-summary.label', {
          wall: formatDuration(tree.wallMs),
          cost: formatUsd(tree.totalUsd) || '$0',
          turns: summary.turns,
          tokensIn: summary.tokensIn.toLocaleString('en-US'),
          tokensOut: summary.tokensOut.toLocaleString('en-US'),
          calls: summary.calls,
          loads: summary.loads,
          extracts: summary.extracts,
          models: summary.models,
          facts: tree.facts.toLocaleString('en-US'),
          results: tree.results,
        })}
        {summary.failed > 0 && (
          <span className='text-error-text'> · {t('trace-failed.label', { count: summary.failed })}</span>
        )}
      </span>
      <Layout.Flex wrap gap='md' aria-label={t('trace-legend.label')}>
        {CATEGORIES.map((category) => {
          const totals = summary.categories[category];
          return (
            <Layout.Flex
              key={category}
              gap='xs'
              align='center'
              classNames='whitespace-nowrap'
              aria-label={t(`trace-category-${category}.description`)}
            >
              <span className={mx('size-2.5 rounded-xs', CATEGORY_CLASSES[category].swatch)} />
              {t(`trace-category-${category}.label`)} <b className='text-fg'>{totals.count}</b> ·{' '}
              {formatDuration(totals.ms)}
              {totals.usd ? ` · ${formatUsd(totals.usd)}` : ''}
            </Layout.Flex>
          );
        })}
      </Layout.Flex>
    </Layout.Flex>
  );
};

export type TracePanelProps = {
  /** The session's trajectory as a tree (`GET /sessions/:run/explain`). */
  tree?: ExplainNode;
  loading?: boolean;
  error?: string;
};

/**
 * EXPLAIN ANALYZE for a session, as lighthouse's web UI shows it: the trajectory as a tree (input -> agent turn ->
 * tool call -> command -> loads, extractions and model calls), each row with its time, a bar placing it on the
 * session's timeline, its cost and what it yielded. Rows are coloured by what ran them (the LLM, System One, or no
 * model); runs of System One calls are folded into one row. Extractions open to their predicates and types.
 */
export const TracePanel = ({ tree, loading, error }: TracePanelProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  // The inputs open on first load, so the agent's turns show; later refreshes keep what the reader opened.
  useEffect(() => {
    if (tree && !initialized) {
      setInitialized(true);
      setOpen(defaultOpen(tree));
    }
  }, [tree, initialized]);

  const summary = useMemo(() => (tree ? summarize(tree) : undefined), [tree]);
  const handleToggle = useCallback(
    (id: string) =>
      setOpen((open) => {
        const next = new Set(open);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      }),
    [],
  );

  if (error) {
    return (
      <Status.Empty classNames='h-full text-error-text' data-testid='lighthouse.trace'>
        {error}
      </Status.Empty>
    );
  }
  if (!tree || !summary) {
    return (
      <Status.Empty classNames='h-full' data-testid='lighthouse.trace'>
        {t(loading ? 'trace-loading.message' : 'trace-empty.message')}
      </Status.Empty>
    );
  }

  const start = Date.parse(tree.t);
  const span = tree.wallMs ?? 0;
  return (
    <Layout.Flex column grow data-testid='lighthouse.trace'>
      <Layout.Flex gap='sm' align='center' classNames='px-3 py-2 border-b border-separator'>
        <Layout.Flex grow classNames='min-w-0'>
          <Summary tree={tree} summary={summary} />
        </Layout.Flex>
        <Button.Root variant='ghost' onClick={() => setOpen(allOpen(tree))} data-testid='lighthouse.trace.expand'>
          {t('trace-expand.label')}
        </Button.Root>
        <Button.Root variant='ghost' onClick={() => setOpen(new Set([tree.id]))}>
          {t('trace-collapse.label')}
        </Button.Root>
      </Layout.Flex>
      <ScrollArea.Root orientation='all' classNames='dx-grow'>
        <ScrollArea.Viewport>
          <div role='treegrid' aria-label={t('trace.label')}>
            <Layout.Grid
              cols={COLUMNS}
              gap='sm'
              role='row'
              classNames='sticky top-0 z-[1] px-3 py-1 bg-base-surface text-[0.625rem] uppercase tracking-wide text-fg-subtle'
            >
              <span role='columnheader'>{t('trace-step.label')}</span>
              <span role='columnheader'>{t('trace-timeline.label')}</span>
              <span role='columnheader' className='text-end'>
                {t('trace-time.label')}
              </span>
              <span role='columnheader' className='text-end'>
                {t('trace-cost.label')}
              </span>
              <span role='columnheader' className='text-end'>
                {t('trace-pages.label')}
              </span>
              <span role='columnheader' className='text-end'>
                {t('trace-facts.label')}
              </span>
              <span role='columnheader' className='text-end'>
                {t('trace-results.label')}
              </span>
            </Layout.Grid>
            <Row node={tree} depth={0} start={start} span={span} open={open} onToggle={handleToggle} />
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Layout.Flex>
  );
};
