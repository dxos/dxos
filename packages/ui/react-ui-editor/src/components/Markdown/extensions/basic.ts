//
// Copyright 2023 DXOS.org
//

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  placeholder,
  rectangularSelection,
} from '@codemirror/view';

export const basicBundle = ({ placeholder: _placeholder }: { placeholder?: string }) => [
  // TODO(burdon): Create custom bundle to make this class more reusable and retire simpler TextEditor component.
  // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
  // https://codemirror.net/docs/ref/#codemirror.basicSetup
  autocompletion(),
  bracketMatching(),
  closeBrackets(),
  crosshairCursor(),
  dropCursor(),
  drawSelection(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  highlightSelectionMatches(),
  highlightSpecialChars(),
  history(),
  indentOnInput(),
  placeholder(_placeholder ?? ''), // TODO(burdon): Needs consistent styling.
  rectangularSelection(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  EditorState.allowMultipleSelections.of(true),
  EditorView.lineWrapping,

  keymap.of([
    ...closeBracketsKeymap,
    ...completionKeymap,
    ...defaultKeymap,
    ...foldKeymap,
    ...historyKeymap,
    ...lintKeymap,
    ...searchKeymap,
    indentWithTab,
  ]),
];
