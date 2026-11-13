//
// Copyright 2026 DXOS.org
//

import { type LayoutName, LAYOUTS } from './frontmatter.ts';
import { slideTokens } from './tokens.ts';

export type FrontmatterCompletion = {
  /** Start of the text the completion replaces. */
  from: number;
  /** The value typed so far, which the options are filtered by. */
  prefix: string;
  options: readonly LayoutName[];
};

const LAYOUT_VALUE = /^layout:[ \t]*([\w-]*)$/;

/**
 * The completion for the frontmatter value at `pos`: the layouts, while the caret is in the value of a `layout:` line
 * inside the slide's frontmatter block. Elsewhere there is nothing to complete.
 */
export const frontmatterCompletion = (content: string, pos: number): FrontmatterCompletion | null => {
  const frontmatter = slideTokens(content).find((token) => token.kind === 'frontmatter');
  if (!frontmatter || pos <= frontmatter.from || pos >= frontmatter.to) {
    return null;
  }

  const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
  const match = LAYOUT_VALUE.exec(content.slice(lineStart, pos));
  if (!match) {
    return null;
  }

  const prefix = match[1];
  return {
    from: pos - prefix.length,
    prefix,
    options: LAYOUTS.filter((layout) => layout.startsWith(prefix)),
  };
};
