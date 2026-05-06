//
// Copyright 2026 DXOS.org
//

// Renders an MCP tool's response. The MCP SDK returns
// `{ content: [{ type: 'text', text: <stringified JSON> }] }` for our tools,
// so we accept either the raw envelope or pre-parsed data and pretty-print
// via the `Syntax` JSON compound (filter input + scrolling viewport +
// highlighted code leaf).

import React from 'react';

import { Message, type ThemedClassName } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { composable, composableProps } from '@dxos/ui-theme';

export type ToolResultsProps = ThemedClassName<{
  /**
   * Result data to render. Already-parsed values land in `Syntax.Root` as-is.
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

export const ToolResults = composable<HTMLDivElement, ToolResultsProps>(
  ({ result, error, loading, ...props }, forwardedRef) => {
    const state: State = loading ? 'loading' : error ? 'error' : result === undefined ? 'empty' : 'result';
    return (
      <div {...composableProps(props, { classNames: 'p-3 text-sm text-description' })} ref={forwardedRef}>
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
        {state === 'result' && (
          <Syntax.Root data={tryParseMcpEnvelope(result)}>
            <Syntax.Content>
              <Syntax.Filter />
              <Syntax.Viewport>
                <Syntax.Code />
              </Syntax.Viewport>
            </Syntax.Content>
          </Syntax.Root>
        )}
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
