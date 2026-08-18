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
 * Everything that does not depend on the item is **built once and shared**, and that is the point of
 * this module rather than a tidiness. `EditorView.theme()` mints a new `StyleModule` and a new
 * generated class on every call, so a set built per item injects one stylesheet per row and
 * invalidates the whole document's style each time it does. Measured at ~14ms per row against ~2ms
 * for the identical set shared (`baseline/mount`) — six times the cost of the first fill, for
 * stylesheets that are all the same.
 *
 * Extensions are descriptors, not instances: a `StateField` or `ViewPlugin` in a shared array is
 * still instantiated per view, so sharing changes nothing but the identity CodeMirror dedupes on.
 */
export const createBlockExtensions = ({
  registry,
  editable = false,
  themeMode = 'light',
  setWidgets,
}: ItemExtensionOptions = {}): Extension[] => [
  ...sharedExtensions(registry, editable, themeMode),
  // The one part that cannot be shared: the callback that hands this item's widgets back to it.
  ...(registry ? [xmlTags({ registry, setWidgets: setWidgets ?? (() => {}), bookmarks: ['prompt'] })] : []),
];

/** Registries are compared by identity, so a feed's single registry is a single cache scope. */
const NO_REGISTRY = {};

const cache = new WeakMap<object, Map<string, Extension[]>>();

const sharedExtensions = (
  registry: XmlWidgetRegistry | undefined,
  editable: boolean,
  themeMode: 'light' | 'dark',
): Extension[] => {
  const scope = registry ?? NO_REGISTRY;
  let byVariant = cache.get(scope);
  if (!byVariant) {
    byVariant = new Map();
    cache.set(scope, byVariant);
  }

  const key = `${editable}:${themeMode}`;
  let extensions = byVariant.get(key);
  if (!extensions) {
    extensions = build(registry, editable, themeMode);
    byVariant.set(key, extensions);
  }

  return extensions;
};

const build = (registry: XmlWidgetRegistry | undefined, editable: boolean, themeMode: 'light' | 'dark'): Extension[] =>
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
    highlights,
    highlightTheme,
  ].filter(Boolean) as Extension[];
