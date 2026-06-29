//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type Range,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';

import { focusField } from '../focus';

// Effect dispatched when the viewport extends (e.g., scrolling reveals new content). The state
// field listens for this and rebuilds decorations across the full doc so images outside the
// initial parse range get widgetized.
const rebuildEffect = StateEffect.define<void>();

export type ImageNodeData = { name: 'Image'; url: string };

export type ImageOptions = {
  /**
   * Predicate that returns true to suppress rendering of an image node.
   * When skipped, the markdown link source is left visible to the user instead of being
   * replaced by an `<img>` widget.
   */
  skip?: (node: ImageNodeData) => boolean;
};

/**
 * Create image decorations.
 */
export const image = (options: ImageOptions = {}): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: (state) => {
        return Decoration.set(buildDecorations(state, 0, state.doc.length, options));
      },
      update: (value: DecorationSet, tr: Transaction) => {
        // Full rebuild when the viewport extended (lazy parse now covers more of the doc).
        if (tr.effects.some((effect) => effect.is(rebuildEffect))) {
          return Decoration.set(buildDecorations(tr.state, 0, tr.state.doc.length, options));
        }
        if (!tr.docChanged && !tr.selection) {
          return value;
        }

        // Find range of changes and cursor changes.
        const cursor = tr.state.selection.main.head;
        const oldCursor = tr.changes.mapPos(tr.startState.selection.main.head);
        let from = Math.min(cursor, oldCursor);
        let to = Math.max(cursor, oldCursor);
        tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
          from = Math.min(from, fromB);
          to = Math.max(to, toB);
        });

        // Expand to cover lines.
        from = tr.state.doc.lineAt(from).from;
        to = tr.state.doc.lineAt(to).to;

        return value.map(tr.changes).update({
          filterFrom: from,
          filterTo: to,
          filter: () => false,
          add: buildDecorations(tr.state, from, to, options),
        });
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
    // Block-replace decorations have to live in a state field, but viewport changes are only
    // observable from a view plugin. Bridge the two by dispatching a rebuild effect whenever
    // the viewport extends so newly-parsed image nodes get widgetized without requiring focus.
    ViewPlugin.define((view) => ({
      update: (update) => {
        if (update.viewportChanged) {
          queueMicrotask(() => view.dispatch({ effects: rebuildEffect.of(undefined) }));
        }
      },
    })),
  ];
};

const buildDecorations = (state: EditorState, from: number, to: number, options: ImageOptions = {}) => {
  const decorations: Range<Decoration>[] = [];
  const cursor = state.selection.main.head;
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Image') {
        const urlNode = node.node.getChild('URL');
        if (urlNode) {
          const hide = state.readOnly || cursor < node.from || cursor > node.to || !state.field(focusField);

          const url = state.sliceDoc(urlNode.from, urlNode.to);
          // Some plugins might be using custom URLs; avoid attempts to render those URLs.
          if (url.match(/^https?:\/\//) === null && url.match(/^file?:\/\//) === null) {
            return;
          }

          // Consumer-supplied filter (e.g., disable remote-image rendering by setting).
          if (options.skip?.({ name: 'Image', url })) {
            return;
          }

          preloadImage(url);
          decorations.push(
            Decoration.replace({
              block: true, // Prevent cursor from entering.
              widget: new ImageWidget(url),
            }).range(hide ? node.from : node.to, node.to),
          );
        }
      }
    },
    from,
    to,
  });

  return decorations;
};

const preloaded = new Set<string>();

const preloadImage = (url: string) => {
  if (!preloaded.has(url)) {
    const img = document.createElement('img');
    img.src = url;
    preloaded.add(url);
  }
};

class ImageWidget extends WidgetType {
  constructor(readonly _url: string) {
    super();
  }

  override eq(other: this) {
    return this._url === other._url;
  }

  override toDOM(view: EditorView) {
    const img = document.createElement('img');
    img.setAttribute('src', this._url);
    img.setAttribute('class', 'cm-image');
    const focused = view.state.field(focusField);
    // If focused, hide image until successfully loaded to avoid flickering effects.
    if (focused) {
      img.onload = () => {
        img.classList.add('cm-loaded-image');
        collapseIfTrackingPixel(img);
      };
    } else {
      img.classList.add('cm-loaded-image');
      img.onload = () => collapseIfTrackingPixel(img);
    }
    // Error (e.g., blocked tracker URL): also collapse so we don't leave a hole.
    img.onerror = () => collapseLine(img);

    return img;
  }
}

/**
 * Tracking pixels are commonly 1×1 (or 0×0) transparent images embedded by mail senders.
 * They add no visual value, so hide them once their natural dimensions are known.
 */
const collapseIfTrackingPixel = (img: HTMLImageElement) => {
  if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
    collapseLine(img);
  }
};

const collapseLine = (img: HTMLImageElement) => {
  img.style.display = 'none';
};
