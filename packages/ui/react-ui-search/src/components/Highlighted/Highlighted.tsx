//
// Copyright 2026 DXOS.org
//

import React, { Fragment, type ReactNode } from 'react';

import { computeMatchSpans } from '../../util';

export type HighlightedProps = { text: string; query: string };

/** Render `text` with case-insensitive `query` occurrences wrapped in <mark>. */
export const Highlighted = ({ text, query }: HighlightedProps) => {
  const spans = computeMatchSpans(text, query);
  if (spans.length === 0) {
    return <>{text}</>;
  }
  const parts: ReactNode[] = [];
  let cursor = 0;
  spans.forEach(({ start, end }, index) => {
    if (start > cursor) {
      parts.push(<Fragment key={`t${index}`}>{text.slice(cursor, start)}</Fragment>);
    }
    parts.push(<mark key={`m${index}`}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) {
    parts.push(<Fragment key='tail'>{text.slice(cursor)}</Fragment>);
  }
  return <>{parts}</>;
};

Highlighted.displayName = 'Highlighted';
