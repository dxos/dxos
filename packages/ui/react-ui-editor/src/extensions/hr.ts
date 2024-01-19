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

  override eq(other: this) {
    return this._pos === (other as any as HorizontalRuleWidget)._pos;
  }

  override toDOM(view: EditorView) {
    const el = document.createElement('div');
    el.className = 'cm-hr';
    return el;
  }
}

// TODO(burdon): Like Tasklist, allow cursor to move into range.

// NOTE: Without a blank line before this markup will treat the previous line as a heading.
// https://www.markdownguide.org/basic-syntax/#horizontal-rules
const placeholderMatcher = new MatchDecorator({
  // regexp: /(?<=\n\n)---/gs,
  regexp: /^---$/gs,
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
    },
  ),
];
