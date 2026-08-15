//
// Copyright 2026 DXOS.org
//

import DOMPurify from 'dompurify';
import React, { memo, useMemo } from 'react';

export type HtmlIslandProps = {
  html: string;
};

/**
 * A message rendered as sanitized HTML — the email case, which is not markdown and cannot be a
 * CodeMirror document.
 *
 * Its presence is the reason the island renderer is generalized rather than markdown-only: the
 * engine owns virtualization, chrome and selection anchors, not what a message looks like inside.
 * As plain (non-contenteditable) DOM it is also the control case for cross-island selection.
 */
export const HtmlIsland = memo(({ html }: HtmlIslandProps) => {
  const sanitized = useMemo(() => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }), [html]);

  return <div className='dx-feed-html' dangerouslySetInnerHTML={{ __html: sanitized }} />;
});

HtmlIsland.displayName = 'HtmlIsland';
