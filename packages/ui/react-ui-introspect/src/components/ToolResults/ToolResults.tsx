//
// Copyright 2026 DXOS.org
//

// Renders an MCP tool's response. The MCP SDK returns
// `{ content: [{ type: 'text', text: <stringified JSON> }] }` for our tools,
// so we accept either the raw envelope or pre-parsed data and pretty-print
// via the JsonHighlighter.

import React, { type HTMLAttributes, type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { composable, composableProps } from '@dxos/ui-theme';

export type ToolResultsProps = {
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
};

type Variant = ThemedClassName<Pick<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-live'>> & {
  children: ReactNode;
};

const pickVariant = ({ result, error, loading }: ToolResultsProps): Variant => {
  if (loading) {
    return {
      classNames: 'p-3 text-sm text-description',
      role: 'status',
      'aria-live': 'polite',
      children: 'Calling tool…',
    };
  }
  if (error) {
    return {
      classNames: 'p-3 text-sm text-errorText whitespace-pre-wrap',
      role: 'alert',
      children: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
  if (result === undefined) {
    return {
      classNames: 'p-3 text-sm text-description italic',
      children: (
        <>
          No result yet — fill the form and click <strong>Run tool</strong>.
        </>
      ),
    };
  }
  return {
    classNames: 'p-3 overflow-auto',
    children: <JsonHighlighter data={tryParseMcpEnvelope(result)} />,
  };
};

export const ToolResults = composable<HTMLDivElement, ToolResultsProps>(
  ({ result, error, loading, ...props }, forwardedRef) => {
    const { children, ...variant } = pickVariant({ result, error, loading });
    return (
      <div {...composableProps(props, variant)} ref={forwardedRef}>
        {children}
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
