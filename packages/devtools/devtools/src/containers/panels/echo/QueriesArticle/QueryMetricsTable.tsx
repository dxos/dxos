//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo, useState } from 'react';

import { type QueryMetrics } from '@dxos/echo-client';
import { Listbox } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Tooltip from '@dxos/react-ui/Tooltip';
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
    render: (query) => <span className={query.active > 0 ? 'text-success-text' : 'text-fg-muted'}>{query.active}</span>,
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
        {query.maxCount > query.lastCount && <span className='text-fg-muted'> ({query.maxCount})</span>}
      </span>
    ),
  },
  {
    id: 'avg',
    label: 'Avg ms',
    title: 'Mean evaluation time, excluding time spent queued or waiting for documents.',
    value: averageQueryTime,
    render: (query) => time(averageQueryTime(query)),
  },
  {
    id: 'max',
    label: 'Max ms',
    title: 'Slowest evaluation time, excluding time spent queued or waiting for documents.',
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

// Items shows the latest count and, when larger, the most ever returned; the timing headers ("Avg ms") need the room too.
const WIDE_COLUMNS: Record<string, Layout.GridTrack> = {
  items: '5rem',
  avg: '4.5rem',
  max: '4.5rem',
  update: '4.5rem',
};
const TRACKS: Layout.GridTrack[] = [
  'minmax(12rem,1fr)',
  ...COLUMNS.slice(1).map(({ id }): Layout.GridTrack => WIDE_COLUMNS[id] ?? '3.75rem'),
];

/** The same tracks as one template, which the list's rows share as a subgrid. */
const COLUMNS_TEMPLATE = TRACKS.join(' ');

type Sort = { column: string; descending: boolean };

/** A selector-safe option value: zag builds element ids and selectors from it, and query text holds quotes. */
const queryKey = (query: string): string => {
  let hash = 5381;
  for (let index = 0; index < query.length; index++) {
    hash = (hash * 33) ^ query.charCodeAt(index);
  }
  return `q${(hash >>> 0).toString(36)}`;
};

export type QueryMetricsTableProps = {
  queries: QueryMetrics[];
  onReset?: () => void;
};

/**
 * Every query of this page's client, grouped by query text, sortable by any figure and slowest first. Rows are a
 * Listbox: the arrow keys move the current row, a click or Enter selects it, and the selected query's metrics show
 * below the list.
 */
export const QueryMetricsTable = ({ queries, onReset }: QueryMetricsTableProps) => {
  const [filter, setFilter] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);
  const [sort, setSort] = useState<Sort>({ column: 'max', descending: true });
  const [selected, setSelected] = useState<string>();

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

  const items = useMemo(
    () => rows.map((query) => ({ value: queryKey(query.query), label: shortQueryText(query.query) })),
    [rows],
  );
  const current = rows.find((query) => queryKey(query.query) === selected);

  const live = queries.reduce((sum, query) => sum + query.active, 0);

  const handleSort = (column: string) =>
    setSort((prev) =>
      prev.column === column ? { column, descending: !prev.descending } : { column, descending: column !== 'query' },
    );

  return (
    <div className='flex flex-col h-full min-h-0'>
      <Toolbar.Root>
        <Searchbar placeholder='Filter queries' value={filter} onChange={setFilter} />
        <Button.Toggle pressed={liveOnly} onPressedChange={setLiveOnly}>
          Live only
        </Button.Toggle>
        <Toolbar.Text classNames='shrink-0 font-mono text-xs text-fg-muted'>
          {live} live · {queries.length} queries
        </Toolbar.Text>
        {onReset && (
          <Button.Root
            variant='ghost'
            icon='ph--arrow-counter-clockwise--regular'
            iconOnly
            label='Reset'
            onClick={onReset}
          />
        )}
      </Toolbar.Root>
      {/* End cells take the same gap the list's rows give theirs, so the header lines up with them. */}
      <Layout.Grid
        cols={TRACKS}
        classNames='px-2 py-1 border-b border-separator-subtle text-xs text-fg-muted [&>*:first-child]:ps-2 [&>*:last-child]:pe-2'
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
                <Icon.Icon size='xs' icon={sort.descending ? 'ph--caret-down--regular' : 'ph--caret-up--regular'} />
              )}
            </button>
          </Tooltip.Trigger>
        ))}
      </Layout.Grid>
      {/* Always the Listbox, so the empty state sits in the same ScrollArea gutter as its rows. */}
      <Listbox.Root
        items={items}
        columns={COLUMNS_TEMPLATE}
        value={selected}
        onValueChange={setSelected}
        classNames='dx-grow'
      >
        <Listbox.Viewport>
          <Listbox.Content>
            {rows.map((query) => (
              <Listbox.Item
                key={query.query}
                id={queryKey(query.query)}
                // The row whose metrics the detail shows: ringed while the list has focus, a click included.
                current={queryKey(query.query) === selected}
                classNames='font-mono text-xs tabular-nums text-end whitespace-nowrap'
                data-testid='query-metrics.row'
              >
                <Tooltip.Trigger asChild content={query.query}>
                  <span className='truncate text-start'>{shortQueryText(query.query)}</span>
                </Tooltip.Trigger>
                {COLUMNS.slice(1).map((column) => (
                  <span key={column.id}>{column.render?.(query) ?? column.value(query).toLocaleString()}</span>
                ))}
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
        <Listbox.Empty>No queries.</Listbox.Empty>
      </Listbox.Root>
      {current && (
        // The highlighter is its own ScrollArea; nested in another, its contained overscroll swallowed the wheel.
        <JsonHighlighter
          classNames='max-h-48 shrink-0 border-t border-separator-subtle text-xs'
          data={{ ...current, avgTime: averageQueryTime(current) }}
        />
      )}
    </div>
  );
};

QueryMetricsTable.displayName = 'QueryMetricsTable';
