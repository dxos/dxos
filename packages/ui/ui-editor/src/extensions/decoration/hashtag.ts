//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

import { getHashStyles, mx } from '@dxos/ui-theme';

// TODO(burdon): Autocomplete from existing tags?
/**
 * Replaces `#tag` occurrences with a styled atomic widget.
 */
export const hashtag = (): Extension => [
  ViewPlugin.fromClass(
    class {
      tags: DecorationSet;
      constructor(view: EditorView) {
        this.tags = tagMatcher.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.tags = tagMatcher.updateDeco(update, this.tags);
      }
    },
    {
      decorations: (instance) => instance.tags,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          return view.plugin(plugin)?.tags || Decoration.none;
        }),
    },
  ),

  styles,
];

class TagWidget extends WidgetType {
  constructor(private _text: string) {
    super();
  }

  toDOM(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = mx('cm-tag', getHashStyles(this._text).surface);
    span.textContent = this._text;
    return span;
  }
}

const tagMatcher = new MatchDecorator({
  // `\w+` stops at the first non-word char, so no trailing boundary is needed; requiring one
  // (e.g. `\W`) would consume that char and fail to match a tag at the end of the document.
  regexp: /#(\w+)/g,
  decoration: (match) =>
    Decoration.replace({
      widget: new TagWidget(match[1]),
    }),
});

const styles = EditorView.theme({
  '.cm-tag': {
    borderRadius: '4px',
    marginRight: '6px',
    padding: '2px 6px',
  },
});
