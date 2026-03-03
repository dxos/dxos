//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, StateField } from '@codemirror/state';
import { type TreeCursor } from '@lezer/common';

export const debugTree = (cb: (tree: DebugNode) => void): Extension =>
  StateField.define({
    create: (state) => cb(convertTreeToJson(state)),
    update: (value, tr) => cb(convertTreeToJson(tr.state)),
  });

export type DebugNode = {
  type: string;
  from: number;
  to: number;
  text: string;
  children: DebugNode[];
};

export const convertTreeToJson = (state: EditorState): DebugNode => {
  const treeToJson = (cursor: TreeCursor): DebugNode => {
    const node: DebugNode = {
      type: cursor.type.name,
      from: cursor.from,
      to: cursor.to,
      text: state.doc.slice(cursor.from, cursor.to).toString(),
      children: [],
    };

    if (cursor.firstChild()) {
      do {
        node.children.push(treeToJson(cursor));
      } while (cursor.nextSibling());
      cursor.parent();
    }

    return node;
  };

  return treeToJson(syntaxTree(state).cursor());
};
