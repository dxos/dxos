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

class VariableWidget extends WidgetType {
  constructor(private readonly name: string) {
    super();
  }

  // TODO(burdon): Not content editable.
  toDOM() {
    const el = document.createElement('a');
    el.innerText = this.name;
    el.setAttribute('class', 'cm-custom');
    return el;
  }
}

const variableMatcher = new MatchDecorator({
  regexp: /\{(\w+)}/g,
  decoration: (match) =>
    Decoration.replace({
      widget: new VariableWidget(match[1]),
    }),
});

/**
 * https://codemirror.net/examples/decoration
 */
// TODO(burdon): https://github.com/codemirror/codemirror5/blob/master/mode/handlebars/handlebars.js
export const customPlugin = ViewPlugin.fromClass(
  class {
    variables: DecorationSet;
    constructor(view: EditorView) {
      this.variables = variableMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      this.variables = variableMatcher.updateDeco(update, this.variables);
    }
  },
  {
    decorations: (instance) => instance.variables,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.variables || Decoration.none;
      }),
  },
);
