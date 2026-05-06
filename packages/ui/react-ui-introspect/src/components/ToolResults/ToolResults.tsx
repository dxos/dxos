//
// Copyright 2026 DXOS.org
//

// Renders an MCP tool's response. The MCP SDK returns
// `{ content: [{ type: 'text', text: <stringified JSON> }] }` for our tools,
// so we accept either the raw envelope or pre-parsed data and pretty-print
// via the JsonHighlighter.

import React, { type HTMLAttributes } from 'react';

import { Message, type ThemedClassName } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { composable, composableProps } from '@dxos/ui-theme';

export type ToolResultsProps = ThemedClassName<{
  /**
   * Result data to render. Already-parsed values land in JsonHighlighter as-is.
   * For convenience, an MCP tool envelope shape (`{ content: [...] }`) is also
   * accepted and the embedded text payload is parsed on the fly.
   */
  result?: unknown;
  /** Set when the tool call (or its surrounding flow) errored. */
  error?: Error | string | null;
  /** Set while a request is in flight. */
  loading?: boolean;
}>;

type State = 'loading' | 'error' | 'empty' | 'result';

// Shared class fragments — every variant pads the wrapper, and the
// loading / empty hints share the same description-text treatment.
const ROOT = 'p-3';
const HINT = 'text-sm text-description';

const VARIANTS: Record<State, ThemedClassName<Pick<HTMLAttributes<HTMLDivElement>, 'role'>>> = {
  // `role='status'` implies `aria-live='polite'` — no need to set both.
  loading: { classNames: [ROOT, HINT], role: 'status' },
  error: { classNames: ROOT },
  empty: { classNames: [ROOT, HINT, 'italic'] },
  result: { classNames: [ROOT, 'overflow-auto'] },
};

export const ToolResults = composable<HTMLDivElement, ToolResultsProps>(
  ({ result, error, loading, ...props }, forwardedRef) => {
    const state: State = loading ? 'loading' : error ? 'error' : result === undefined ? 'empty' : 'result';
    return (
      <div {...composableProps(props, VARIANTS[state])} ref={forwardedRef}>
        {state === 'loading' && 'Calling tool…'}
        {state === 'error' && (
          <Message.Root valence='error'>
            {error instanceof Error && <Message.Title>{error.name}</Message.Title>}
            <Message.Content>{error instanceof Error ? error.message : String(error)}</Message.Content>
          </Message.Root>
        )}
        {state === 'empty' && (
          <>
            No result yet — fill the form and click <strong>Run tool</strong>.
          </>
        )}
        {state === 'result' && <JsonHighlighter data={tryParseMcpEnvelope(result)} />}
      </div>
    );
  },
);

ToolResults.displayName = 'ToolResults';

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
