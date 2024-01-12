//
// Copyright 2023 DXOS.org
//

import {
  Decoration,
  type DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

import { getToken } from '../styles';

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-hr': {
    // TODO(burdon): ???
    // Note that block-level decorations should not have vertical margins,
    borderBottom: `1px solid ${getToken('extend.colors.neutral.200')}`,
  },
});

class HorizontalRuleWidget extends WidgetType {
  constructor(readonly _pos: number) {
    super();
  }

  override eq(other: WidgetType) {
    return this._pos === (other as any as HorizontalRuleWidget)._pos;
  }

  toDOM(view: EditorView) {
    // TODO(burdon): Create <hr> element? Does this clash with markdown parser?
    const el = document.createElement('div');
    el.className = 'cm-hr';
    return el;
  }
}

const placeholderMatcher = new MatchDecorator({
  regexp: /^---$/g,
  decoration: (match, view, pos) =>
    Decoration.replace({
      widget: new HorizontalRuleWidget(pos),
    }),
});

export const hr = () => [
  styles,
  ViewPlugin.fromClass(
    class {
      rules: DecorationSet;
      constructor(view: EditorView) {
        this.rules = placeholderMatcher.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.rules = placeholderMatcher.updateDeco(update, this.rules);
      }
    },
    {
      decorations: (instance) => instance.rules,
      // TODO(burdon): Is this really atomic (cursor can move into ---).
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          return view.plugin(plugin)?.rules || Decoration.none;
        }),
    },
  ),
];
