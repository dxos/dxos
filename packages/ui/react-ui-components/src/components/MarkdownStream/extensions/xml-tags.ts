//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, type WidgetType } from '@codemirror/view';
import { type FC } from 'react';

import { log } from '@dxos/log';

import { ReactWidget } from './ReactWidget';
import { decoSetToArray } from './util';
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

/**
 * Update context.
 */
export const xmlTagContext = StateEffect.define<any>();

/**
 * Update widget.
 */
export const xmlTagUpdate = StateEffect.define<{ id: string; value: any }>();

type WidgetState = {
  [id: string]: any;
};

type DecorationField = {
  from: number;
  decorations: DecorationSet;
};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = (options: XmlTagOptions = {}): Extension => {
  // Contexts state.
  const contextState = StateField.define<any>({
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

  // Widget decorations.
  const decorationsState = StateField.define<DecorationField>({
    create: (state) => buildDecorations(state, 0, state.doc.length, options, state.field(contextState)),
    update: ({ from, decorations }, tr) => {
      if (tr.docChanged) {
        // Flag if the transaction has modified the head of the document.
        // (i.e., any changes that touch before the current `from` position).
        const reset = tr.changes.touchesRange(0, from);

        // Since append-only, rebuild decorations from after the last widget.
        const result = buildDecorations(
          tr.state,
          reset ? 0 : from,
          tr.state.doc.length,
          tr.state.field(contextState),
          options,
        );

        // Merge with existing decorations.
        return { from: result.from, decorations: decorations.update({ add: decoSetToArray(result.decorations) }) };
      }

      return { from, decorations: decorations.map(tr.changes) };
    },
    provide: (field) => EditorView.decorations.from(field, (v) => v.decorations),
  });

  // State management.
  const widgetState = StateField.define<WidgetState>({
    create: () => ({}),
    update: (value, tr) => {
      for (const e of tr.effects) {
        if (e.is(xmlTagUpdate)) {
          // TODO(burdon): Render.
          console.log('update', e.value.id);
          return { ...value, [e.value.id]: e.value };
        }
      }

      return value;
    },
  });

  return [contextState, decorationsState, widgetState];
};

/**
 * Creates widget decorations for XML tags in the document using the syntax tree.
 */
const buildDecorations = (
  state: EditorState,
  from: number,
  to: number,
  context: any,
  options: XmlTagOptions,
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
        // XML Element.
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
                from = node.node.to;
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
