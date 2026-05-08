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

import { Message, ScrollArea, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Row, RowList } from '@dxos/react-ui-list';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { composable, composableProps } from '@dxos/ui-theme';

import { translationKey } from '#translations';

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
    const { t } = useTranslation(translationKey);
    const state: State = loading ? 'loading' : error ? 'error' : result === undefined ? 'empty' : 'result';
    return (
      <div {...composableProps(props, { classNames: 'dx-container' })} ref={forwardedRef}>
        {state === 'loading' && <p className='p-3 text-sm text-description'>{t('calling-tool.message')}</p>}
        {state === 'error' && (
          <div className='p-form-chrome'>
            <Message.Root valence='error'>
              {error instanceof Error && <Message.Title>{error.name}</Message.Title>}
              <Message.Content>{error instanceof Error ? error.message : String(error)}</Message.Content>
            </Message.Root>
          </div>
        )}
        {state === 'empty' && <p className='p-3 text-sm text-description'>{t('no-result.message')}</p>}
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
  const { t } = useTranslation(translationKey);
  const items = toItems(data);
  // The two-column grid lives on `RowList.Content` so every entry across
  // every row lands in the same `key | value` tracks. Each `Row` spans
  // both columns and uses `grid-cols-subgrid` to inherit them, so a
  // `KeyValueTable` can emit plain `<div>` cells as direct grid items.
  return (
    <RowList.Root>
      <RowList.Viewport>
        <RowList.Content aria-label={t('tool-result.label')} classNames='grid grid-cols-[max-content_1fr] gap-x-3'>
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
  const { t } = useTranslation(translationKey);
  if (record === null || typeof record !== 'object') {
    return <div className='col-span-2 font-mono text-xs'>{formatValue(record)}</div>;
  }

  const entries = Object.entries(record as Record<string, unknown>).filter(([key]) => !SKIP_KEYS.has(key));
  if (entries.length === 0) {
    return <div className='col-span-2 text-sm italic text-description'>{t('no-displayable-fields.message')}</div>;
  }

  return (
    <>
      {entries.map(([key, value]) => (
        <Fragment key={key}>
          <div className='flex items-center justify-end font-mono text-xs text-description'>{key}</div>
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

const isPrimitive = (value: unknown): value is string | number | boolean | null | undefined =>
  value === null || (typeof value !== 'object' && typeof value !== 'function');

const formatValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return '—';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    // Only string-join arrays of primitives — joining objects yields
    // "[object Object], [object Object], …" via Array.prototype.toString.
    if (value.every(isPrimitive)) {
      return `[${value.map((item) => (typeof item === 'string' ? item : String(item))).join(', ')}]`;
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const tryParseMcpEnvelope = (value: unknown): unknown => {
  // The MCP SDK returns
  // `{ structuredContent?: object, content: [{ type: 'text', text: '<json>' }, ...] }`
  // for our tools. Prefer the already-parsed `structuredContent` when
  // present; otherwise unwrap the JSON-stringified `content[0].text`.
  // Anything else is rendered verbatim.
  if (value && typeof value === 'object') {
    const envelope = value as { structuredContent?: unknown; content?: unknown };
    if (envelope.structuredContent !== undefined) {
      return envelope.structuredContent;
    }
    if (Array.isArray(envelope.content)) {
      const text = (envelope.content as Array<{ type?: string; text?: string }>).find(
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
  }
  return value;
};
