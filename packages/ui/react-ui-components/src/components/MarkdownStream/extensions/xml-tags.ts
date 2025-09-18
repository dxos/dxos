//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type Range,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, type WidgetType } from '@codemirror/view';
import { type FC } from 'react';

import { log } from '@dxos/log';

import { ReactWidget } from './ReactWidget';
import { nodeToJson } from './xml-util';

export type XmlEventHandler<TEvent = any> = (event: TEvent) => void;

export type XmlComponentProps<TContext = any, TProps = any> = TProps & {
  context: TContext;
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
};

export const xmlTagContext = StateEffect.define<any>();

// OPTIMIZATION
// Create state field to map widgets => DOM placeholder.
// State effect to update state.
// Track position of last widget for rebuilding.

type DecorationField = {
  from: number;
  decorations: DecorationSet;
};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = (options: XmlTagOptions = {}): Extension => {
  const context = StateField.define<any>({
    create: () => null,
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
    StateField.define<DecorationField>({
      create: (state) => buildDecorations(state, 0, state.doc.length, options, state.field(context)),
      update: ({ from, decorations }, tr) => {
        if (tr.docChanged) {
          // Since append-only, rebuild decorations from the last widget and merge with existing.
          const result = buildDecorations(tr.state, from, tr.state.doc.length, options, tr.state.field(context));
          return { from: result.from, decorations: decorations.update({ add: decoSetToArray(result.decorations) }) };
        }

        return { from, decorations: decorations.map(tr.changes) };
      },
      provide: (field) => EditorView.decorations.from(field, (v) => v.decorations),
    }),
  ];
};

/**
 * Creates decorations for XML tags in the document using the syntax tree.
 */
const buildDecorations = (
  state: EditorState,
  from: number,
  to: number,
  options: XmlTagOptions,
  context: any,
): DecorationField => {
  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(state);
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return { from, decorations: Decoration.none };
  }

  tree.iterate({
    from,
    to,
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
                from = node.node.from;
                builder.add(node.node.from, node.node.to, Decoration.replace({ widget, block }));
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

  return { from, decorations: builder.finish() };
};

// TODO(burdon): Util.
const decoSetToArray = (deco: DecorationSet): readonly Range<Decoration>[] => {
  const ranges: Range<Decoration>[] = [];
  const iter = deco.iter();
  while (iter.value) {
    ranges.push({
      from: iter.from,
      to: iter.to,
      value: iter.value,
    });
    iter.next();
  }

  return ranges;
};
