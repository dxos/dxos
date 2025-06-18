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

import { getHashColor } from '@dxos/react-ui-theme';

class TagWidget extends WidgetType {
  constructor(private _text: string) {
    super();
  }

  toDOM(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'cm-tag';
    span.textContent = this._text;
    span.style.setProperty('--dx-tagColor', getHashColor(this._text).color);
    return span;
  }
}

const tagMatcher = new MatchDecorator({
  regexp: /#(\w+)\W/g,
  decoration: (match) =>
    Decoration.replace({
      widget: new TagWidget(match[1]),
    }),
});

// TODO(burdon): Autocomplete from existing tags?
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

  EditorView.theme({
    '.cm-tag': {
      border: 'red',
      borderRadius: '4px',
      marginRight: '6px',
      padding: '2px 4px',
      color: 'var(--dx-baseSurface)',
      backgroundColor: 'var(--dx-tagColor)',
      fontSize: '12px',
      verticalAlign: 'text-bottom',
    },
  }),
];
