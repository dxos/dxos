//
// Copyright 2023 DXOS.org
//

import {
  EditorView,
  MatchDecorator,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

class PlaceholderWidget extends WidgetType {
  constructor(private readonly name: string) {
    super();
  }

  toDOM() {
    const el = document.createElement('a');
    el.innerText = this.name;
    el.setAttribute('class', 'cm-custom');
    return el;
  }
}

const placeholderMatcher = new MatchDecorator({
  regexp: /\{(\w+)}/g,
  decoration: (match) =>
    Decoration.replace({
      widget: new PlaceholderWidget(match[1]),
    }),
});

/**
 * https://codemirror.net/examples/decoration
 */
// TODO(burdon): https://github.com/codemirror/codemirror5/blob/master/mode/handlebars/handlebars.js
export const customPlugin = ViewPlugin.fromClass(
  class {
    placeholders: DecorationSet;
    constructor(view: EditorView) {
      this.placeholders = placeholderMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      this.placeholders = placeholderMatcher.updateDeco(update, this.placeholders);
    }
  },
  {
    decorations: (instance) => instance.placeholders,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.placeholders || Decoration.none;
      }),
  },
);
