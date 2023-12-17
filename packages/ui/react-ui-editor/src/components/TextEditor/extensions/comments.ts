//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type RangeSet,
  RangeSetBuilder,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, EditorView, keymap, type Rect, WidgetType } from '@codemirror/view';

// 1. TODO(burdon): Make atomic.
// 2. TODO(burdon): Create/track threads in composer (change global state). Select/follow. Scroll with page.
// 3. TODO(burdon): Support multiple threads in sidebar?
// 4. TODO(burdon): Anchor AI thread when creating section.
// 5. TODO(burdon): Button to resolve thread to close comments.

class BookmarkWidget extends WidgetType {
  constructor(private readonly _pos: number) {
    super();
  }

  override eq(other: BookmarkWidget) {
    return this._pos === other._pos;
  }

  // TODO(burdon): Click to select.
  override toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bookmark';
    // https://emojifinder.com/comment
    span.textContent = '💬';
    return span;
  }
}

/**
 * Range sets provide a data structure that can hold a collection of tagged,
 * possibly overlapping ranges in such a way that they can efficiently be mapped though document changes.
 * https://codemirror.net/docs/ref/#state
 */
const update = (decorations: RangeSet<any> | undefined, state: EditorState, options: CommentOptions) => {
  // TODO(burdon): Update existing rangeset (snippet below from GPT):
  //  https://discuss.codemirror.net/t/rangeset-with-metadata-and-different-decorations/3874
  // decorations = decorations.map(tr.changes);
  // for (const effect of tr.effects) {
  //   if (effect.is(addDecorationEffect)) {
  //     const deco = Decoration.mark({ atomic: true }).range(effect.value.from, effect.value.to);
  //     decorations = decorations.update({ add: [deco] });
  //   } else if (effect.is(removeDecorationEffect)) {
  //     decorations = decorations.update({ filter: (from, to) => from !== effect.value });
  //   }
  // }
  // return decorations;

  const builder = new RangeSetBuilder<Decoration>();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Link') {
        const marks = node.node.getChildren('LinkMark');
        const urlNode = node.node.getChild('URL');
        const text = marks.length >= 2 ? state.sliceDoc(marks[0].to, marks[1].from) : '';
        if (!urlNode && text.startsWith('^')) {
          builder.add(
            node.from,
            node.to,
            // TODO(burdon): Atomic range?
            //  https://codemirror.net/docs/ref/#view.EditorView%5EatomicRanges
            //  Do this also for links (so that vertical cursor movement doesn't open them).
            Decoration.replace({
              // TODO(burdon): Cant store additional metadata in this object.
              widget: new BookmarkWidget(node.from),
            }),
          );

          return false;
        }
      }
    },
  });

  return builder.finish();
};

// TODO(burdon): Reconcile with theme.
export const styles = EditorView.baseTheme({
  '& .cm-bookmark': {
    cursor: 'pointer',
    margin: '4px',
    padding: '4px',
    backgroundColor: 'yellow',
  },
});

export type CommentOptions = {
  onCreate?: () => string;
  onUpdate?: (info: { pos: number; location: Rect }) => void;
};

// TODO(burdon): Import note (performance):
//  Easily track & remove content with decorations
//  https://discuss.codemirror.net/t/easily-track-remove-content-with-decorations/4606
// TODO(burdon): Backspace should delete completely.

// https://www.markdownguide.org/extended-syntax/#footnotes
// TODO(burdon): Record span in automerge model?
// TODO(burdon): Extended markdown: https://www.markdownguide.org/extended-syntax
export const comments = (options: CommentOptions = {}): Extension => {
  // TODO(burdon): Create atomic range.
  const bookmarks = StateField.define<RangeSet<Decoration>>({
    create: (state) => update(undefined, state, options),
    update: (decorations: RangeSet<any>, tr: Transaction) => update(decorations, tr.state, options),
    provide: (field) => EditorView.decorations.from(field),
  });

  return [
    keymap.of([
      {
        // TODO(burdon): Ignored?
        key: 'Backspace',
        run: (view) => {
          console.log('!!');
          const { from, to } = view.state.selection.main;
          if (from !== to) {
            return false;
          }

          const range = view.state.field(bookmarks);
          console.log(range);
          return false;
        },
      },
      {
        key: 'alt-meta-c', // TODO(burdon): Config.
        run: (view) => {
          const pos = view.state.selection.main.head;
          // Insert footnote.
          const id = options.onCreate?.();
          if (id) {
            view.dispatch({
              changes: { from: pos, insert: `[^id-${id}]` },
            });

            return true;
          }

          return false;
        },
      },
    ]),

    bookmarks,

    EditorView.updateListener.of((update) => {
      const view = update.view;
      const pos = view.state.selection.main.head;

      const decorations: { from: number; to: number; value: Decoration }[] = [];
      const rangeSet = view.state.field<RangeSet<Decoration>>(bookmarks);
      rangeSet.between(pos, pos + 1, (from, to, value) => {
        if (value.spec.widget) {
          decorations.push({ from, to, value });
        }
      });

      if (decorations.length) {
        const location = view.coordsAtPos(decorations[0].from);
        if (location) {
          options.onUpdate?.({ pos, location });
        }
      }
    }),

    styles,
  ];
};
