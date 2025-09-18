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

export type StateDispatch<T> = T | ((state: T) => T);

/**
 * Manages widget state.
 */
export interface XmlWidgetStateManager {
  updateWidget<T>(id: string, props: StateDispatch<T>): void;
}

export type XmlEventHandler<TEvent = any> = (event: TEvent) => void;

/**
 * Widget component.
 */
export type XmlWidgetProps<TContext = any, TProps = any> = TProps & {
  context: TContext;
  tag: string;
  onEvent?: XmlEventHandler;
};

/**
 * Factory for creating widgets.
 */
export type XmlWidgetFactory = (props: XmlWidgetProps, onEvent?: XmlEventHandler) => WidgetType | null;

/**
 * Widget registry definition.
 */
export type XmlWidgetDef = {
  block?: boolean;
  /** Native widget. */
  factory?: XmlWidgetFactory;
  /** React widget. */
  Component?: FC<XmlWidgetProps>;
};

export type XmlWidgetRegistry = Record<string, XmlWidgetDef>;

/**
 * Update context.
 */
export const xmlTagContextEffect = StateEffect.define<any>();

/**
 * Update widget.
 */
export const xmlTagUpdateEffect = StateEffect.define<{ id: string; value: any }>();

type WidgetDecorationSet = {
  from: number;
  decorations: DecorationSet;
};

type WidgetStateMap = Record<string, any>;

export type XmlTagsOptions = {
  registry?: XmlWidgetRegistry;
};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = (options: XmlTagsOptions = {}): Extension => {
  //
  // Context state.
  //
  const contextState = StateField.define<any>({
    create: () => undefined,
    update: (value, tr) => {
      for (const effect of tr.effects) {
        if (effect.is(xmlTagContextEffect)) {
          return effect.value;
        }
      }

      return value;
    },
  });

  //
  // Widget decorations.
  //
  const decorationsState = StateField.define<WidgetDecorationSet>({
    create: (state) => {
      return buildDecorations(state, 0, state.doc.length, options, state.field(contextState), state.field(widgetState));
    },
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
          tr.state.field(widgetState),
          options,
        );

        // Merge with existing decorations.
        return { from: result.from, decorations: decorations.update({ add: decoSetToArray(result.decorations) }) };
      }

      return { from, decorations: decorations.map(tr.changes) };
    },
    provide: (field) => EditorView.decorations.from(field, (v) => v.decorations),
  });

  //
  // Widget state management.
  //
  const widgetState = StateField.define<WidgetStateMap>({
    create: () => ({}),
    update: (map, tr) => {
      for (const e of tr.effects) {
        if (e.is(xmlTagUpdateEffect)) {
          // Update accumulated widget props by id.
          const { id, value } = e.value;
          const newValue = typeof value === 'function' ? value(map[id]) : value;
          const nextMap = { ...map, [id]: newValue } as WidgetStateMap;

          // Find and render widget.
          const { decorations } = tr.state.field(decorationsState);
          for (const range of decoSetToArray(decorations)) {
            const deco = range.value;
            const widget = deco?.spec?.widget;
            if (widget && widget instanceof ReactWidget && widget.id === e.value.id) {
              widget.render(newValue);
            }
          }

          return nextMap;
        }
      }

      return map;
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
  widgetState: WidgetStateMap,
  options: XmlTagsOptions,
): WidgetDecorationSet => {
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
              const state = widgetState[props.id];
              const widget = factory
                ? factory({ context, ...props })
                : Component
                  ? props.id && new ReactWidget(props.id, Component, { context, ...props, ...state })
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
