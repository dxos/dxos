//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { composable } from '@dxos/ui-theme';
import { type CreateReplacerProps, createReplacer, safeStringify } from '@dxos/util';

import { SyntaxHighlighter, type SyntaxHighlighterProps } from '../SyntaxHighlighter';

export type JsonReplacer = CreateReplacerProps | ((key: string, value: any) => any);

export type JsonHighlighterProps = Omit<SyntaxHighlighterProps, 'children' | 'language'> & {
  data?: any;
  replacer?: JsonReplacer;
  /** Indentation passed to `JSON.stringify`. Default: `2` (pretty-printed). Pass `0` for single-line output. */
  indent?: number;
  testId?: string;
};

const resolveReplacer = (replacer?: JsonReplacer) => {
  if (!replacer) {
    return undefined;
  }
  return typeof replacer === 'function' ? replacer : createReplacer(replacer);
};

/**
 * Inline, non-scrolling JSON renderer.
 *
 * Thin wrapper around `SyntaxHighlighter` that stringifies `data` with an optional replacer.
 * `replacer` accepts either `CreateReplacerProps` (declarative truncation) or a raw
 * `JSON.stringify`-compatible function (for bespoke serialization).
 * For filtering and scroll behaviour, compose with the `Syntax.*` namespace.
 */
export const JsonHighlighter = composable<HTMLDivElement, JsonHighlighterProps>(
  ({ data, replacer, indent = 2, testId, ...props }, forwardedRef) => {
    return (
      <SyntaxHighlighter {...props} language='json' data-testid={testId} ref={forwardedRef}>
        {safeStringify(data, resolveReplacer(replacer), indent)}
      </SyntaxHighlighter>
    );
  },
);

JsonHighlighter.displayName = 'JsonHighlighter';
