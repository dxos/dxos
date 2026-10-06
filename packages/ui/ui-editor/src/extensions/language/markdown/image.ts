//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField, type Transaction } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { focusField } from '../../state/focus.ts';
import { isWidgetLink } from '../../widgets/link-widgets.ts';

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
        let from = Number.POSITIVE_INFINITY;
        let to = Number.NEGATIVE_INFINITY;
        if (tr.docChanged || tr.selection) {
          // The changed ranges and both cursor positions, since an image's source is shown only under the cursor.
          const cursor = tr.state.selection.main.head;
          const oldCursor = tr.changes.mapPos(tr.startState.selection.main.head);
          from = Math.min(cursor, oldCursor);
          to = Math.max(cursor, oldCursor);
          tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
            from = Math.min(from, fromB);
            to = Math.max(to, toB);
          });
        }

        // The parser extends the tree in transactions of its own as the viewport reaches unparsed content, so images
        // there are decorated as they are parsed rather than by rebuilding the whole document on every scroll.
        const parsedBefore = tr.changes.mapPos(syntaxTree(tr.startState).length);
        const parsedAfter = syntaxTree(tr.state).length;
        if (parsedAfter > parsedBefore) {
          from = Math.min(from, parsedBefore);
          to = Math.max(to, parsedAfter);
        }

        if (from > to) {
          return value.map(tr.changes);
        }

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

          // A registered link widget's image is the widget's to render; otherwise the consumer's
          // filter (e.g., disable remote-image rendering by setting).
          if (isWidgetLink(state, url) || options.skip?.({ name: 'Image', url })) {
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
