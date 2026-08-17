//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useThemeContext } from '@dxos/react-ui';
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

import { type HighlightRange, highlights, highlightTheme, setHighlights } from './highlight';
import { useSelectionGroup } from './selection-group';

export type MarkdownItemProps = {
  text: string;
  /**
   * When false the view mounts with `EditorView.editable.of(false)`, which drops `contenteditable`
   * from the DOM. Browsers refuse to extend one selection across two contenteditable hosts, so this
   * is what decides whether a drag can span adjacent items.
   */
  editable?: boolean;
  registry?: XmlWidgetRegistry;
  hits?: readonly HighlightRange[];
  /** Number of block widgets this item currently has mounted; 0 once it unmounts. */
  onWidgetsChange?: (count: number) => void;
};

/**
 * One message as its own markdown document.
 *
 * Each item owns a document, so streaming appends and per-message editing stay local — where a
 * single thread-wide document needs a cursor and a range table to know which message it is touching.
 */
export const MarkdownItem = memo(({ text, editable = false, registry, hits, onWidgetsChange }: MarkdownItemProps) => {
  const { themeMode } = useThemeContext();
  const [view, setView] = useState<EditorView | null>(null);
  // React widgets render in portals into hosts the extension places in the document, so the item has
  // to own them: a widget's tree belongs to the React root that rendered the item, not to CodeMirror.
  const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Read through a ref so the group never lands in the extension deps: rebuilding extensions
  // reconstructs the view, which would discard the selection the reader just made.
  const selectionGroup = useSelectionGroup();
  const selectionGroupRef = useRef(selectionGroup);
  selectionGroupRef.current = selectionGroup;

  const extensions = useMemo<Extension[]>(
    () =>
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
        registry && xmlTags({ registry, setWidgets, bookmarks: ['prompt'] }),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet && !update.state.selection.main.empty) {
            selectionGroupRef.current.claim(update.view);
          }
        }),
        highlights,
        highlightTheme,
      ].filter(Boolean) as Extension[],
    [editable, themeMode, registry],
  );

  // Deliberately NOT `useTextEditor`, which builds the view in a passive effect — i.e. after paint.
  // The virtualizer measures each row as it mounts, so a row whose document does not exist yet
  // measures at chrome height and then grows, shifting every row below it. Constructing the view in
  // the layout phase gives the row its real height before the first paint, so it is measured once.
  const initialTextRef = useRef(text);
  useLayoutEffect(() => {
    const parent = rootRef.current;
    if (!parent) {
      return;
    }

    const instance = new EditorView({
      parent,
      state: EditorState.create({ doc: initialTextRef.current, extensions }),
    });
    const unregister = selectionGroupRef.current.register(instance);
    setView(instance);

    return () => {
      unregister();
      instance.destroy();
      setView(null);
    };
  }, [extensions]);

  // The document belongs to the model, not the view: a message whose text changes is reconciled
  // rather than remounted, so the virtualizer's measurement for this row survives the update.
  const currentRef = useRef(text);
  useEffect(() => {
    if (!view || currentRef.current === text) {
      return;
    }

    const previous = currentRef.current;
    currentRef.current = text;
    initialTextRef.current = text;
    // A streaming tail only ever extends: dispatch the delta so CodeMirror keeps scroll position and
    // decorations instead of rebuilding the document on every frame.
    view.dispatch(
      text.startsWith(previous)
        ? { changes: { from: previous.length, insert: text.slice(previous.length) } }
        : { changes: { from: 0, to: view.state.doc.length, insert: text } },
    );
  }, [view, text]);

  useEffect(() => {
    view?.dispatch({ effects: setHighlights.of(hits ?? []) });
  }, [view, hits]);

  // Reported rather than derived: the widgets are portals into the item's own document, so nothing
  // above the item can count them without reaching into the DOM.
  useEffect(() => {
    onWidgetsChange?.(widgets.length);
    return () => onWidgetsChange?.(0);
  }, [widgets.length, onWidgetsChange]);

  // A block widget is measured once, when CodeMirror mounts it. Its content is React rendered into a
  // portal, so anything that changes height afterwards — a disclosure opening, an image loading —
  // leaves the editor holding a stale height and drawing the lines below it over the widget.
  //
  // Observing the portal roots and asking for a re-measure is what keeps the document's geometry
  // honest; the row's own height then follows through the virtualizer's observer.
  useEffect(() => {
    if (!view || !widgets.length) {
      return;
    }

    const observer = new ResizeObserver(() => view.requestMeasure());
    for (const { root } of widgets) {
      observer.observe(root);
    }

    return () => observer.disconnect();
  }, [view, widgets]);

  return (
    <>
      <div ref={rootRef} />
      {widgets.map(({ Component, root, id, props }) => (
        <div key={id}>{createPortal(<Component view={view ?? undefined} {...props} />, root)}</div>
      ))}
    </>
  );
});

MarkdownItem.displayName = 'MarkdownItem';
