//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, type WidgetType } from '@codemirror/view';
import { type FC } from 'react';

import { log } from '@dxos/log';

import { ReactWidget } from './ReactWidget';
import { nodeToJson } from './xml-util';

export type XmlEventHandler<TEvent = any> = (event: TEvent) => void;

export type XmlComponentProps<TProps = any> = TProps &
  Pick<XmlTagOptions, 'context'> & {
    tag: string;
    onEvent?: XmlEventHandler;
  };

export type XmlWidgetFactory = (props: XmlComponentProps, onEvent?: XmlEventHandler) => WidgetType | null;

export type XmlComponentDef = {
  block?: boolean;
  factory?: XmlWidgetFactory;
  Component?: FC<XmlComponentProps>;
};

export type XmlComponentRegistry = Record<string, XmlComponentDef>;

export type XmlTagOptions = {
  registry?: XmlComponentRegistry;
  context?: any;
};

export const xmlTagContext = StateEffect.define<any>();

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = (options: XmlTagOptions = {}): Extension => {
  const context = StateField.define<any>({
    create: () => options.context,
    update: (value, tr) => {
      for (const effect of tr.effects) {
        if (effect.is(xmlTagContext)) {
          return effect.value;
        }
      }
      return value;
    },
  });

  return [
    context,

    // Tags.
    StateField.define<DecorationSet>({
      create: (state) => buildXmlTagDecorations(state, options, state.field(context)),
      update: (decorations, tr) => {
        if (tr.docChanged) {
          return buildXmlTagDecorations(tr.state, options, tr.state.field(context));
        }

        return decorations.map(tr.changes);
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
  ];
};

/**
 * Creates decorations for XML tags in the document using the syntax tree.
 */
function buildXmlTagDecorations(state: EditorState, options: XmlTagOptions, context: any): DecorationSet {
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
            // Check tag is closed before creating widget.
            const props = nodeToJson(state, node.node);
            if (options.registry && props?.tag) {
              const { block, factory, Component } = options.registry[props.tag] ?? {};
              const widget = factory
                ? factory({ context, ...props })
                : Component
                  ? new ReactWidget(Component, { context, ...props })
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
