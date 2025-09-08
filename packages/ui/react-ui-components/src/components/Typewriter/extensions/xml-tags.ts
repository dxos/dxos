//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

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
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return Decoration.none;
  }

  tree.iterate({
    enter: (node) => {
      switch (node.type.name) {
        case 'Element': {
          const tagName = getTagName(state, node.node);
          if (tagName) {
            decorations.push(
              Decoration.replace({
                widget: new ReactWidget<TestProps>(Test, { tagName }),
                side: 1,
              }).range(node.node.from, node.node.to),
            );
          }

          return false; // Don't descend into children.
        }
      }
    },
  });

  return Decoration.set(decorations);
}

/**
 * Get tag name by finding the first TagName node within this Element.
 */
const getTagName = (state: EditorState, node: SyntaxNode): string | undefined => {
  let tagName: string | undefined;

  const cursor = node.cursor();
  cursor.iterate((node) => {
    if (node.type.name === 'TagName' && !tagName) {
      tagName = state.doc.sliceString(node.from, node.to);
      return false; // Stop iteration.
    }
  });

  return tagName;
};
