//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { type FC } from 'react';

import { ElementWidget, ReactWidget } from './widgets';
import { nodeToJson } from './xml-util';

export type XmlComponentProps<TProps = any> = { tag: string } & TProps;

export type XmlComponentDef = {
  type?: 'element' | 'react';
  Component?: FC<XmlComponentProps>;
};

export type XmlComponentRegistry = Record<string, XmlComponentDef>;

export type XmlTagOptions = {
  registry?: XmlComponentRegistry;
};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = ({ registry }: XmlTagOptions = {}): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: (state) => {
        return createXmlTagDecorations(state, registry);
      },
      update: (decorations, tr) => {
        if (tr.docChanged) {
          return createXmlTagDecorations(tr.state, registry);
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
function createXmlTagDecorations(state: EditorState, registry?: XmlComponentRegistry): DecorationSet {
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
          if (registry && props.tag) {
            const def = registry[props.tag];
            if (def) {
              const { Component } = def;
              if (Component) {
                // React components.
                decorations.push(
                  Decoration.replace({
                    widget: new ReactWidget(Component, props),
                  }).range(node.node.from, node.node.to),
                );
              } else {
                // Lit components.
                const { tag, ...rest } = props;
                decorations.push(
                  Decoration.replace({
                    widget: new ElementWidget(tag, rest),
                  }).range(node.node.from, node.node.to),
                );
              }
            }
          }

          return false; // Don't descend into children.
        }
      }
    },
  });

  return Decoration.set(decorations);
}
