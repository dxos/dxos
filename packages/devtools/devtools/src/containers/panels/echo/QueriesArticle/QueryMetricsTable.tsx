//
// Copyright 2026 DXOS.org
//

import React, { Fragment, type ReactNode, useMemo, useState } from 'react';

import { type QueryMetrics } from '@dxos/echo-client';
import { Button, Grid, Icon, ScrollArea, Toggle, Toolbar, Tooltip } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { Searchbar } from '../../../../components/index.ts';
import { Unit, averageQueryTime, queryFiredCount, queryTimeClassName, shortQueryText } from '../../../cards/util.tsx';

type Column = {
  id: string;
  label: string;
  title: string;
  value: (query: QueryMetrics) => number | string;
  render?: (query: QueryMetrics) => ReactNode;
};

const time = (value: number) => <span className={queryTimeClassName(value)}>{Unit.ms(value)}</span>;

const COLUMNS: Column[] = [
  {
    id: 'query',
    label: 'Query',
    title: 'Query text; queries with the same text are grouped.',
    value: (query) => query.query,
  },
  {
    id: 'fired',
    label: 'Fired',
    title: 'One-shot runs plus reactive subscriptions.',
    value: queryFiredCount,
  },
  {
    id: 'active',
    label: 'Live',
    title: 'Reactive queries running now.',
    value: (query) => query.active,
    render: (query) => (
      <span className={query.active > 0 ? 'text-success-text' : 'text-description'}>{query.active}</span>
    ),
  },
  { id: 'updates', label: 'Updates', title: 'Reactive result recomputations.', value: (query) => query.updates },
  {
    id: 'items',
    label: 'Items',
    title: 'Items in the latest result (most ever returned).',
    value: (query) => query.lastCount,
    render: (query) => (
      <span>
        {query.lastCount.toLocaleString()}
        {query.maxCount > query.lastCount && <span className='text-description'> ({query.maxCount})</span>}
      </span>
    ),
  },
  {
    id: 'avg',
    label: 'Avg ms',
    title: 'Mean time to answer.',
    value: averageQueryTime,
    render: (query) => time(averageQueryTime(query)),
  },
  {
    id: 'max',
    label: 'Max ms',
    title: 'Slowest time to answer.',
    value: (query) => query.maxTime,
    render: (query) => time(query.maxTime),
  },
  {
    id: 'update',
    label: 'Upd ms',
    title: 'Slowest reactive recomputation.',
    value: (query) => query.maxUpdateTime,
    render: (query) => time(query.maxUpdateTime),
  },
];

const TRACKS = ['minmax(12rem,1fr)', ...COLUMNS.slice(1).map(() => '3.75rem')];

type Sort = { column: string; descending: boolean };

export type QueryMetricsTableProps = {
  queries: QueryMetrics[];
  onReset?: () => void;
};

/**
 * Every query of this page's client, grouped by query text, sortable by any figure and slowest first.
 */
export const QueryMetricsTable = ({ queries, onReset }: QueryMetricsTableProps) => {
  const [filter, setFilter] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);
  const [sort, setSort] = useState<Sort>({ column: 'max', descending: true });
  const [expanded, setExpanded] = useState<string>();

  const rows = useMemo(() => {
    const column = COLUMNS.find(({ id }) => id === sort.column) ?? COLUMNS[0];
    const text = filter.toLowerCase();
    return queries
      .filter((query) => (!liveOnly || query.active > 0) && query.query.toLowerCase().includes(text))
      .sort((a, b) => {
        const left = column.value(a);
        const right = column.value(b);
        const order =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right));
        return (sort.descending ? -order : order) || a.query.localeCompare(b.query);
      });
  }, [queries, filter, liveOnly, sort]);

  const live = queries.reduce((sum, query) => sum + query.active, 0);

  const handleSort = (column: string) =>
    setSort((prev) =>
      prev.column === column ? { column, descending: !prev.descending } : { column, descending: column !== 'query' },
    );

  return (
    <div className='flex flex-col h-full min-h-0'>
      <Toolbar.Root>
        <Searchbar placeholder='Filter queries' value={filter} onChange={setFilter} />
        <Toggle pressed={liveOnly} onPressedChange={setLiveOnly}>
          Live only
        </Toggle>
        <Toolbar.Text classNames='shrink-0 font-mono text-xs text-description'>
          {live} live · {queries.length} queries
        </Toolbar.Text>
        {onReset && (
          <Button
            variant='ghost'
            icon='ph--arrow-counter-clockwise--regular'
            iconOnly
            label='Reset'
            onClick={onReset}
          />
        )}
      </Toolbar.Root>
      <Grid
        cols={TRACKS}
        gap='sm'
        grow={false}
        classNames='px-2 py-1 border-b border-subdued-separator text-xs text-description'
      >
        {COLUMNS.map((column, index) => (
          <Tooltip.Trigger key={column.id} asChild content={column.title}>
            <button
              type='button'
              className={mx('flex items-center gap-1 whitespace-nowrap', index > 0 && 'justify-end')}
              onClick={() => handleSort(column.id)}
            >
              {column.label}
              {sort.column === column.id && (
                <Icon size='xs' icon={sort.descending ? 'ph--caret-down--regular' : 'ph--caret-up--regular'} />
              )}
            </button>
          </Tooltip.Trigger>
        ))}
      </Grid>
      <ScrollArea.Root orientation='vertical' classNames='dx-grow'>
        <ScrollArea.Viewport>
          {rows.length === 0 && <p className='p-2 text-xs text-description'>No queries.</p>}
          {rows.map((query) => {
            const open = expanded === query.query;
            return (
              <Fragment key={query.query}>
                <Grid
                  asChild
                  cols={TRACKS}
                  gap='sm'
                  align='center'
                  grow={false}
                  classNames={[
                    'w-full px-2 py-0.5 font-mono text-xs tabular-nums text-end hover:bg-hover-surface',
                    open && 'bg-hover-surface',
                  ]}
                >
                  <button
                    type='button'
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? undefined : query.query)}
                  >
                    <Tooltip.Trigger asChild content={query.query}>
                      <span className='truncate text-start'>{shortQueryText(query.query)}</span>
                    </Tooltip.Trigger>
                    {COLUMNS.slice(1).map((column) => (
                      <span key={column.id}>{column.render?.(query) ?? column.value(query).toLocaleString()}</span>
                    ))}
                  </button>
                </Grid>
                {open && (
                  <div className='px-2 py-1 text-xs border-y border-subdued-separator'>
                    <JsonHighlighter data={{ ...query, avgTime: averageQueryTime(query) }} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

QueryMetricsTable.displayName = 'QueryMetricsTable';
