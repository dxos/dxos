//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { type FC } from 'react';

import { ReactWidget } from './ReactWidget';
import { nodeToJson } from './xml-util';

export type XmlComponentProps<TProps = any> = { tag: string } & TProps;
export type XmlComponentFactory = (tag: string) => FC<XmlComponentProps> | undefined;

export type XmlTagOptions = {
  factory?: XmlComponentFactory;
};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = ({ factory }: XmlTagOptions = {}): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: (state) => {
        return createXmlTagDecorations(state, factory);
      },
      update: (decorations, tr) => {
        if (tr.docChanged) {
          return createXmlTagDecorations(tr.state, factory);
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
function createXmlTagDecorations(state: EditorState, factory?: XmlComponentFactory): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return Decoration.none;
  }

  tree.iterate({
    enter: (node) => {
      switch (node.type.name) {
        case 'Element': {
          const props = nodeToJson(state, node.node);
          if (props.tag) {
            const Component = factory?.(props.tag);
            if (Component) {
              decorations.push(
                Decoration.replace({
                  widget: new ReactWidget(Component, props),
                }).range(node.node.from, node.node.to),
              );
            }
          }

          return false; // Don't descend into children.
        }
      }
    },
  });

  return Decoration.set(decorations);
}
