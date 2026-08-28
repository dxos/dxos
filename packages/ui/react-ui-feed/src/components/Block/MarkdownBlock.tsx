//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { type XmlWidgetRegistry, type XmlWidgetState } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { createBlockExtensions } from './extensions';
import { type HighlightRange, setHighlights } from './highlight';
import { useSelectionGroup } from './selection-group';

export type MarkdownBlockProps = ThemedClassName<{
  text: string;
  /**
   * Drip appended text in per frame (the typewriter) instead of dispatching whole deltas. The
   * source's chunk size is whatever the transport delivered — often a whole block — and painting
   * that in one frame reads as blocks appearing fully formed rather than an answer being written.
   * When it turns off (the turn ended), whatever is still queued lands at once.
   */
  stream?: boolean;
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
}>;

/**
 * One message as its own markdown document.
 *
 * Each item owns a document, so streaming appends and per-message editing stay local — where a
 * single thread-wide document needs a cursor and a range table to know which message it is touching.
 */
export const MarkdownBlock = memo(
  ({ classNames, text, stream, editable = false, registry, hits, onWidgetsChange }: MarkdownBlockProps) => {
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
      () => [
        ...createBlockExtensions({ registry, editable, themeMode, setWidgets }),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet && !update.state.selection.main.empty) {
            selectionGroupRef.current.claim(update.view);
          }
        }),
      ],
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
    //
    // Two cursors: `targetRef` is the model's latest text, `dispatchedRef` is what the document
    // holds. Outside streaming they move together; while streaming, the drip below advances
    // `dispatchedRef` a few characters per frame toward the target.
    const targetRef = useRef(text);
    const dispatchedRef = useRef(text);
    const dripRaf = useRef(0);

    useEffect(() => {
      if (!view) {
        return;
      }

      targetRef.current = text;
      initialTextRef.current = text;
      if (dispatchedRef.current === text) {
        return;
      }

      // A non-append (a rewrite, a view-type switch, a rewind) lands atomically — dripping a
      // replacement would show the reader a half-rewritten document.
      if (!text.startsWith(dispatchedRef.current)) {
        cancelAnimationFrame(dripRaf.current);
        dripRaf.current = 0;
        dispatchedRef.current = text;
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
        return;
      }

      if (!stream) {
        // The turn is over (or was never streaming): whatever is pending lands at once.
        cancelAnimationFrame(dripRaf.current);
        dripRaf.current = 0;
        const from = dispatchedRef.current.length;
        dispatchedRef.current = text;
        view.dispatch({ changes: { from, insert: text.slice(from) } });
        return;
      }

      // The typewriter: a bounded slice of the backlog per frame, so the cadence is a write rather
      // than a paste and a burst still catches up within a second. XML tags land whole — a dripped
      // half-tag would flash literal markup before the parser can classify it.
      if (dripRaf.current) {
        return;
      }

      const tick = () => {
        const target = targetRef.current;
        const dispatched = dispatchedRef.current;
        if (!target.startsWith(dispatched)) {
          // The target was rewritten mid-drip; the effect above handles it on its next run.
          dripRaf.current = 0;
          return;
        }

        const backlog = target.slice(dispatched.length);
        if (!backlog.length) {
          dripRaf.current = 0;
          return;
        }

        let take = Math.max(2, Math.ceil(backlog.length / 30));
        if (backlog[0] === '<') {
          const close = backlog.indexOf('>');
          take = close === -1 ? 0 : Math.max(take, close + 1);
        } else {
          const tag = backlog.indexOf('<');
          if (tag !== -1) {
            take = Math.min(take, tag);
          }
        }

        if (take > 0) {
          const insert = backlog.slice(0, take);
          dispatchedRef.current = dispatched + insert;
          view.dispatch({ changes: { from: dispatched.length, insert } });
        }

        dripRaf.current = requestAnimationFrame(tick);
      };

      dripRaf.current = requestAnimationFrame(tick);
    }, [view, text, stream]);

    // The queue dies with the item; the document is rebuilt from the model on the next mount.
    useEffect(() => () => cancelAnimationFrame(dripRaf.current), []);

    // Nothing is dispatched to clear highlights that were never set: a transaction makes CodeMirror
    // re-measure the document, and a viewport of rows mounting is a viewport of forced layouts for a
    // search that is not running.
    const highlighted = useRef(false);
    useEffect(() => {
      if (!view || (!hits?.length && !highlighted.current)) {
        return;
      }

      highlighted.current = Boolean(hits?.length);
      view.dispatch({ effects: setHighlights.of(hits ?? []) });
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
        {/* No query container here: a prompt's bubble is sized by this element's text, which
            inline-size containment would stop contributing. */}
        <div className={mx(classNames)} ref={rootRef} />
        {widgets.map(({ Component, root, id, props }) => (
          <div key={id}>{createPortal(<Component view={view ?? undefined} {...props} />, root)}</div>
        ))}
      </>
    );
  },
);

MarkdownBlock.displayName = 'MarkdownBlock';
