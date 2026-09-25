//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import {
  type DiffLayout,
  type DiffLineTarget,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffBlocks,
  walkthroughSidebar,
  walkthroughTheme,
} from '@dxos/ui-editor';
import { type ThemeMode } from '@dxos/ui-types';

/** A definite content width, which the diff chunks cap themselves against. */
const slots: ThemeExtensionsOptions['slots'] = {
  content: { className: 'dx-container-type-inline-size w-full mx-auto! max-w-[min(72rem,100%-3rem)] py-3!' },
};

export type DiffDocumentOptions = {
  themeMode: ThemeMode;
  /** The navigation rail beside the document; `none` for a document that is a single file. */
  sidebar?: 'full' | 'stats' | 'none';
  layout?: DiffLayout;
  onLineComment?: (target: DiffLineTarget, anchor: HTMLElement) => void;
};

/**
 * A read-only markdown document whose ```diff fences render as diff chunks — the one reading surface
 * both a walkthrough and a single changed file are shown in, so the two cannot drift apart.
 */
export const diffDocumentExtensions = ({
  themeMode,
  sidebar = 'none',
  layout,
  onLineComment,
}: DiffDocumentOptions): Extension => [
  createThemeExtensions({ themeMode, slots }),
  createBasicExtensions({ lineWrapping: true, readOnly: true }),
  createMarkdownExtensions(),
  decorateMarkdown(),
  walkthroughTheme(),
  diffBlocks({ layout, ...(onLineComment ? { onLineComment } : {}) }),
  sidebar === 'none' ? [] : walkthroughSidebar({ variant: sidebar }),
];
