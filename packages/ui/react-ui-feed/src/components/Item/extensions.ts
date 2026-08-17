//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';

import {
  type XmlWidgetRegistry,
  type XmlWidgetState,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  xmlBlockDecoration,
  xmlFormatting,
  xmlTags,
} from '@dxos/ui-editor';

import { highlights, highlightTheme } from './highlight';

export type ItemExtensionOptions = {
  registry?: XmlWidgetRegistry;
  editable?: boolean;
  themeMode?: 'light' | 'dark';
  setWidgets?: (widgets: XmlWidgetState[]) => void;
};

/**
 * The extension set one item's document is built from.
 *
 * Factored out of the component because the list's first fill is dominated by the cost of building
 * these: a viewport of rows is a viewport of editors, all constructed in the same frame. Keeping the
 * set in one place lets `construction.ts` time the real thing rather than a copy that drifts.
 */
export const createItemExtensions = ({
  registry,
  editable = false,
  themeMode = 'light',
  setWidgets,
}: ItemExtensionOptions = {}): Extension[] =>
  [
    createBasicExtensions({ readOnly: !editable, editable, lineWrapping: true }),
    createThemeExtensions({ themeMode }),
    // A registry changes how the document is *parsed*, not only how it is decorated: registered
    // tags have to survive as single blocks through the markdown parser before `xmlTags` can
    // replace them, and without that they render as the literal angle brackets they are.
    registry ? extendedMarkdown({ registry }) : createMarkdownExtensions(),
    registry && xmlFormatting({ skip: ['prompt'] }),
    decorateMarkdown(),
    // The tags are hidden but the prompt is NOT framed here: the frame is chrome's, which also
    // owns the rewind toolbar under it. Styling it in both places drew the border twice.
    registry?.prompt && xmlBlockDecoration({ tag: 'prompt', hideTags: true }),
    registry && xmlTags({ registry, setWidgets: setWidgets ?? (() => {}), bookmarks: ['prompt'] }),
    highlights,
    highlightTheme,
  ].filter(Boolean) as Extension[];
