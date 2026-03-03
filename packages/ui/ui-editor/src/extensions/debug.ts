//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type RangeSet, StateField, type Transaction } from '@codemirror/state';

// eslint-disable-next-line no-console
export const debugNodeLogger = (log: (...args: any[]) => void = console.log): Extension => {
  const logTokens = (state: EditorState) => syntaxTree(state).iterate({ enter: (node) => log(node.type) });
  return StateField.define<any>({
    create: (state) => logTokens(state),
    update: (_: RangeSet<any>, tr: Transaction) => logTokens(tr.state),
  });
};
