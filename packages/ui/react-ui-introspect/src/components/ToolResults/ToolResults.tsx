//
// Copyright 2026 DXOS.org
//

// Renders an MCP tool's response. The MCP SDK returns
// `{ content: [{ type: 'text', text: <stringified JSON> }] }` for our tools,
// so we accept either the raw envelope or pre-parsed data.
//
// Default rendering is a compact key/value table built on `RowList` —
// one row per top-level entry in the result. Pass `debug` to switch to
// the raw JSON view via the `Syntax` compound (filter input + scrolling
// viewport + highlighted code leaf) for inspecting the wire format.

import React, { Fragment } from 'react';

import { Message, ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { Row, RowList } from '@dxos/react-ui-list';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { composable, composableProps } from '@dxos/ui-theme';

export type ToolResultsProps = ThemedClassName<{
  /**
   * Result data to render. Already-parsed values land in the table /
   * `Syntax.Root` as-is. For convenience, an MCP tool envelope shape
   * (`{ content: [...] }`) is also accepted and the embedded text payload
   * is parsed on the fly.
   */
  result?: unknown;
  /** Set when the tool call (or its surrounding flow) errored. */
  error?: Error | string | null;
  /** Set while a request is in flight. */
  loading?: boolean;
  /** Render the raw JSON via `Syntax.Root` instead of the compact table. */
  debug?: boolean;
}>;

type State = 'loading' | 'error' | 'empty' | 'result';

export const ToolResults = composable<HTMLDivElement, ToolResultsProps>(
  ({ result, error, loading, debug, ...props }, forwardedRef) => {
    const state: State = loading ? 'loading' : error ? 'error' : result === undefined ? 'empty' : 'result';
    return (
      <div {...composableProps(props, { classNames: 'dx-container' })} ref={forwardedRef}>
        {state === 'loading' && <p className='p-3 text-sm text-description'>Calling tool…</p>}
        {state === 'error' && (
          <Message.Root valence='error'>
            {error instanceof Error && <Message.Title>{error.name}</Message.Title>}
            <Message.Content>{error instanceof Error ? error.message : String(error)}</Message.Content>
          </Message.Root>
        )}
        {state === 'empty' && (
          <p className='p-3 text-sm text-description'>
            No result yet — fill the form and click <strong>Run tool</strong>.
          </p>
        )}
        {state === 'result' &&
          (debug ? (
            <Syntax.Root data={tryParseMcpEnvelope(result)}>
              <Syntax.Content>
                <Syntax.Filter />
                <Syntax.Viewport>
                  <Syntax.Code />
                </Syntax.Viewport>
              </Syntax.Content>
            </Syntax.Root>
          ) : (
            <ScrollArea.Root thin>
              <ScrollArea.Viewport>
                <ResultTable data={tryParseMcpEnvelope(result)} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          ))}
      </div>
    );
  },
);

ToolResults.displayName = 'ToolResults';

//
// ResultTable
//

// Properties hidden from the compact view. Source-location records are
// noisy and only useful for debugging — that's what `debug` is for.
const SKIP_KEYS = new Set(['location', 'metaLocation']);

const ResultTable = ({ data }: { data: unknown }) => {
  const items = toItems(data);
  // The two-column grid lives on `RowList.Content` so every entry across
  // every row lands in the same `key | value` tracks. Each `Row` spans
  // both columns and uses `grid-cols-subgrid` to inherit them, so a
  // `KeyValueTable` can emit plain `<div>` cells as direct grid items.
  return (
    <RowList.Root>
      <RowList.Viewport>
        <RowList.Content aria-label='Tool result' classNames='grid grid-cols-[max-content_1fr] gap-x-3'>
          {items.map((item, index) => (
            <Row key={index} id={String(index)} classNames='col-span-2 grid grid-cols-subgrid gap-y-0.5'>
              <KeyValueTable record={item} />
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
};

// Emits plain `<div>` cells (key + value) as direct grid children so they
// participate in `ResultTable`'s shared subgrid. `<dl>/<dt>/<dd>` would
// imply term-and-definition semantics these arbitrary record fields don't
// have, so divs are the honest tag here.
const KeyValueTable = ({ record }: { record: unknown }) => {
  if (record === null || typeof record !== 'object') {
    return <div className='col-span-2 font-mono text-xs'>{formatValue(record)}</div>;
  }

  const entries = Object.entries(record as Record<string, unknown>).filter(([key]) => !SKIP_KEYS.has(key));
  if (entries.length === 0) {
    return <div className='col-span-2 text-sm italic text-description'>(no displayable fields)</div>;
  }

  return (
    <>
      {entries.map(([key, value]) => (
        <Fragment key={key}>
          <div className='font-mono text-xs text-description text-right'>{key}</div>
          <div className='text-sm truncate'>{formatValue(value)}</div>
        </Fragment>
      ))}
    </>
  );
};

// Pull the inner array / object out of the `{ data, note?, truncated? }`
// envelope our shapers wrap responses in. Single objects render as one
// row; primitives are wrapped in a one-element list. Arrays pass through.
const toItems = (data: unknown): unknown[] => {
  const inner =
    data && typeof data === 'object' && 'data' in (data as object) ? (data as { data: unknown }).data : data;
  if (Array.isArray(inner)) {
    return inner;
  }
  if (inner === null || inner === undefined) {
    return [];
  }
  return [inner];
};

const formatValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : `[${value.join(', ')}]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const tryParseMcpEnvelope = (value: unknown): unknown => {
  // The MCP SDK returns `{ content: [{ type: 'text', text: '<json>' }, ...] }`
  // for our tools. Unwrap that one common shape so callers don't have to
  // remember to pre-parse. Anything else is rendered verbatim.
  if (
    value &&
    typeof value === 'object' &&
    'content' in value &&
    Array.isArray((value as { content: unknown }).content)
  ) {
    const text = (value as { content: Array<{ type?: string; text?: string }> }).content.find(
      (c) => c?.type === 'text' && typeof c.text === 'string',
    )?.text;
    // Explicit undefined check — an empty string is a legitimate payload
    // (e.g. a tool returning `""` should render as an empty result, not
    // fall through to dumping the raw envelope).
    if (text !== undefined) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  return value;
};
