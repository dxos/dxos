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

import { Message, type ThemedClassName } from '@dxos/react-ui';
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

const HINT = 'text-sm text-description';

export const ToolResults = composable<HTMLDivElement, ToolResultsProps>(
  ({ result, error, loading, debug, ...props }, forwardedRef) => {
    const state: State = loading ? 'loading' : error ? 'error' : result === undefined ? 'empty' : 'result';
    return (
      <div {...composableProps(props, { classNames: 'p-3' })} ref={forwardedRef}>
        {state === 'loading' && <p className={HINT}>Calling tool…</p>}
        {state === 'error' && (
          <Message.Root valence='error'>
            {error instanceof Error && <Message.Title>{error.name}</Message.Title>}
            <Message.Content>{error instanceof Error ? error.message : String(error)}</Message.Content>
          </Message.Root>
        )}
        {state === 'empty' && (
          <p className={HINT}>
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
            <ResultTable data={tryParseMcpEnvelope(result)} />
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
  if (items.length === 0) {
    return <p className={HINT}>(empty result)</p>;
  }
  return (
    <RowList.Root>
      <RowList.Viewport>
        <RowList.Content aria-label='Tool result'>
          {items.map((item, index) => (
            <Row key={index} id={String(index)}>
              <KeyValueTable record={item} />
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
};

const KeyValueTable = ({ record }: { record: unknown }) => {
  if (record === null || typeof record !== 'object') {
    return <span className='font-mono text-xs'>{formatValue(record)}</span>;
  }
  const entries = Object.entries(record as Record<string, unknown>).filter(([key]) => !SKIP_KEYS.has(key));
  if (entries.length === 0) {
    return <span className={`${HINT} italic`}>(no displayable fields)</span>;
  }
  return (
    <dl className='grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5'>
      {entries.map(([key, value]) => (
        <Fragment key={key}>
          <dt className='font-mono text-xs text-description'>{key}</dt>
          <dd className='text-sm truncate'>{formatValue(value)}</dd>
        </Fragment>
      ))}
    </dl>
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
