//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, type WidgetType } from '@codemirror/view';
import { type FC } from 'react';

import { log } from '@dxos/log';

import { ReactWidget } from './ReactWidget';
import { nodeToJson } from './xml-util';

export type XmlEventHandler<TEvent = any> = (event: TEvent) => void;

export type XmlWidgetFactory = (props: XmlComponentProps, onEvent?: XmlEventHandler) => WidgetType | null;
export type XmlComponentProps<TProps = any> = { tag: string; onEvent?: XmlEventHandler } & TProps;

export type XmlComponentDef = {
  block?: boolean;
  factory?: XmlWidgetFactory;
  Component?: FC<XmlComponentProps>;
};

export type XmlComponentRegistry = Record<string, XmlComponentDef>;

export type XmlTagOptions = {
  registry?: XmlComponentRegistry;
  onEvent?: XmlEventHandler;
};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = (options: XmlTagOptions = {}): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: (state) => {
        return createXmlTagDecorations(state, options);
      },
      update: (decorations, tr) => {
        if (tr.docChanged) {
          return createXmlTagDecorations(tr.state, options);
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
function createXmlTagDecorations(state: EditorState, options: XmlTagOptions): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return Decoration.none;
  }

  tree.iterate({
    enter: (node) => {
      switch (node.type.name) {
        case 'Element': {
          try {
            // TODO(burdon): Check tag is closed before creating widget.
            const props = nodeToJson(state, node.node);
            if (options.registry && props?.tag) {
              const { block, factory, Component } = options.registry[props.tag] ?? {};
              const widget = factory
                ? factory(props, options.onEvent)
                : Component
                  ? new ReactWidget(Component, { ...props, onEvent: options.onEvent })
                  : undefined;
              if (widget) {
                decorations.push(Decoration.replace({ widget, block }).range(node.node.from, node.node.to));
              }
            }
          } catch (err) {
            log.catch(err);
          }

          return false; // Don't descend into children.
        }
      }
    },
  });

  return Decoration.set(decorations);
}
