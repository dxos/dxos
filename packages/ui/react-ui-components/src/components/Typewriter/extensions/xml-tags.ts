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

          // Log the node structure to understand it better
          console.log('XMLBlock node:', node.type.name);
          console.log('XMLBlock content:', content);

          // Try iterating through the XMLBlock's children using tree iteration
          const xmlNode = node.node;
          tree.iterate({
            from: xmlNode.from,
            to: xmlNode.to,
            enter: (childNode) => {
              console.log('Child node type:', childNode.type.name, 'from:', childNode.from, 'to:', childNode.to);

              // Look for opening tag patterns
              if (
                childNode.type.name === 'OpenTag' ||
                childNode.type.name === 'SelfClosingTag' ||
                childNode.type.name === 'StartTag'
              ) {
                // Extract tag name from the tag content
                const tagContent = state.doc.sliceString(childNode.from, childNode.to);
                const match = tagContent.match(/<(\w+)/);
                if (match) {
                  tagName = match[1];
                  return false; // Stop iteration
                }
              }

              // Also check for direct tag name nodes
              if (
                childNode.type.name === 'TagName' ||
                childNode.type.name === 'XMLTagName' ||
                childNode.type.name === 'ElementName'
              ) {
                tagName = state.doc.sliceString(childNode.from, childNode.to);
                return false; // Stop iteration
              }
            },
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
