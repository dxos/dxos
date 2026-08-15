//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { memo, useEffect, useMemo, useRef } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  type XmlWidgetRegistry,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  xmlTags,
} from '@dxos/ui-editor';

import { type HighlightRange, highlights, highlightTheme, setHighlights } from './highlight';

export type MarkdownIslandProps = {
  text: string;
  /**
   * When false the view mounts with `EditorView.editable.of(false)`, which drops `contenteditable`
   * from the DOM. Browsers refuse to extend one selection across two contenteditable hosts, so this
   * is what decides whether a drag can span adjacent islands.
   */
  editable?: boolean;
  registry?: XmlWidgetRegistry;
  hits?: readonly HighlightRange[];
};

/**
 * One message as its own markdown document.
 *
 * Each island owns a document, so streaming appends and per-message editing stay local — where a
 * single thread-wide document needs a cursor and a range table to know which message it is touching.
 */
export const MarkdownIsland = memo(({ text, editable = false, registry, hits }: MarkdownIslandProps) => {
  const { themeMode } = useThemeContext();

  const extensions = useMemo<Extension[]>(
    () =>
      [
        createBasicExtensions({ readOnly: !editable, lineWrapping: true }),
        createThemeExtensions({ themeMode }),
        createMarkdownExtensions(),
        decorateMarkdown(),
        registry && xmlTags({ registry }),
        !editable && EditorView.editable.of(false),
        highlights,
        highlightTheme,
      ].filter(Boolean) as Extension[],
    [editable, themeMode, registry],
  );

  const { parentRef, view } = useTextEditor(() => ({ initialValue: text, extensions }), [extensions]);

  // The document belongs to the model, not the view: a message whose text changes is reconciled
  // rather than remounted, so the virtualizer's measurement for this row survives the update.
  const currentRef = useRef(text);
  useEffect(() => {
    if (!view || currentRef.current === text) {
      return;
    }

    const previous = currentRef.current;
    currentRef.current = text;
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

  return <div ref={parentRef} />;
});

MarkdownIsland.displayName = 'MarkdownIsland';
