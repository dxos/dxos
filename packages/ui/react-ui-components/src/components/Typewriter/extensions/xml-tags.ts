//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

import { ReactWidget } from './ReactWidget';
import { Test, type TestProps } from './Test';

export type XmlTagOptions = {};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = (_options: XmlTagOptions = {}): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: (state) => {
        return createXmlTagDecorations(state);
      },
      update: (decorations, tr) => {
        if (tr.docChanged) {
          return createXmlTagDecorations(tr.state);
        }

        return decorations.map(tr.changes);
      },
      provide: (f) => EditorView.decorations.from(f),
    }),
  ];
};

/**
 * Creates decorations for XML tags in the document using the syntax tree.
 */
function createXmlTagDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);
  
  // Check if syntax tree is available
  if (!tree || tree.type.name === 'Program' && tree.length === 0) {
    return Decoration.none;
  }
  
  tree.iterate({
    enter: (node) => {
      switch (node.type.name) {
        case 'Element': {
          const from = node.from;
          const to = node.to;
          const content = state.doc.sliceString(from, to);
          decorations.push(
            Decoration.widget({
              widget: new ReactWidget<TestProps>(Test, { text: content }),
              side: 1,
            }).range(to),
          );
          return false; // Don't descend into children
        }
      }
    },
  });

  return Decoration.set(decorations);
}
