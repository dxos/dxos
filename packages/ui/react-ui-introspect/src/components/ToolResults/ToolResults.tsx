//
// Copyright 2026 DXOS.org
//

// Renders an MCP tool's response. The MCP SDK returns
// `{ content: [{ type: 'text', text: <stringified JSON> }] }` for our tools,
// so we accept either the raw envelope or pre-parsed data and pretty-print
// via the JsonHighlighter.

import React from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

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
  className?: string;
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
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  return value;
};

export const ToolResults = ({ result, error, loading, className }: ToolResultsProps) => {
  if (loading) {
    return (
      <div className={mx('p-3 text-sm text-description', className)} role='status' aria-live='polite'>
        Calling tool…
      </div>
    );
  }
  if (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return (
      <div className={mx('p-3 text-sm text-errorText whitespace-pre-wrap', className)} role='alert'>
        {message}
      </div>
    );
  }
  if (result === undefined) {
    return (
      <div className={mx('p-3 text-sm text-description italic', className)}>
        No result yet — fill the form and click <strong>Run tool</strong>.
      </div>
    );
  }
  return (
    <div className={mx('p-3 overflow-auto', className)}>
      <JsonHighlighter data={tryParseMcpEnvelope(result)} />
    </div>
  );
};
