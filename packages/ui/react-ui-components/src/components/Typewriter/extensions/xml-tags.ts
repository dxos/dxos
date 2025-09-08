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
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return Decoration.none;
  }

  tree.iterate({
    enter: (node) => {
      switch (node.type.name) {
        case 'XMLBlock': {
          const from = node.node.from;
          const to = node.node.to;
          const content = state.doc.sliceString(from, to);

          // Get tag name from the XMLBlock's child nodes.
          let tagName = 'unknown';
          
          // The XMLBlock should now contain proper XML nodes thanks to parseMixed
          tree.iterate({
            from: node.from,
            to: node.to,
            enter: (childNode) => {
              // Look for Element nodes which represent the XML tags
              if (childNode.type.name === 'Element') {
                // Find the TagName within the Element
                tree.iterate({
                  from: childNode.from,
                  to: childNode.to,
                  enter: (innerNode) => {
                    if (innerNode.type.name === 'TagName') {
                      tagName = state.doc.sliceString(innerNode.from, innerNode.to);
                      return false; // Stop iteration
                    }
                  }
                });
                return false; // Stop outer iteration
              }
              
              // Also check for direct TagName nodes (for self-closing tags)
              if (childNode.type.name === 'TagName') {
                tagName = state.doc.sliceString(childNode.from, childNode.to);
                return false; // Stop iteration
              }
            }
          });

          decorations.push(
            Decoration.replace({
              widget: new ReactWidget<TestProps>(Test, { text: content, tagName }),
              side: 1,
            }).range(from, to),
          );

          return false; // Don't descend into children.
        }
      }
    },
  });

  return Decoration.set(decorations);
}
