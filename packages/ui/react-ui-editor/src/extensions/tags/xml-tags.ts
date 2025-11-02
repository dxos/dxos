//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { Prec } from '@codemirror/state';
import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { type ComponentType, type FC } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type Range } from '../../types';
import { decorationSetToArray } from '../../util';
import { scrollToLineEffect } from '../scrolling';

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
export type XmlWidgetProps<TProps = any, TContext = any> = TProps & {
  _tag: string;
  context: TContext;
  view?: EditorView;
  range?: { from: number; to: number };
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
  /** Block widget. */
  block?: boolean;
  /** Native widget (rendered inline). */
  factory?: XmlWidgetFactory;
  /** React widget (rendered in portals outside of the editor). */
  Component?: FC<XmlWidgetProps>;
};

export type XmlWidgetRegistry = Record<string, XmlWidgetDef>;

export const getXmlTextChild = (children: any[]): string | null => {
  const child = children?.[0];
  return typeof child === 'string' ? child : null;
};

/**
 * Update context.
 */
export const xmlTagContextEffect = StateEffect.define<any>();

/**
 * Update widget.
 */
export const xmlTagUpdateEffect = StateEffect.define<{ id: string; value: any }>();

/**
 * Reset all state.
 */
export const xmlTagResetEffect = StateEffect.define();

type WidgetDecorationSet = {
  from: number;
  decorations: DecorationSet;
};

type XmlWidgetStateMap = Record<string, any>;

export type XmlWidgetState = {
  id: string;
  props: any;
  root: HTMLElement;
  Component: ComponentType<XmlWidgetProps>;
};

export interface XmlWidgetNotifier {
  mounted(widget: XmlWidgetState): void;
  unmounted(id: string): void;
}

/**
 * Context state.
 */
const contextStateField = StateField.define<any>({
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

/**
 * Widget state management.
 */
const widgetStateField = StateField.define<XmlWidgetStateMap>({
  create: () => ({}),
  update: (map, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(xmlTagResetEffect)) {
        return {};
      }

      if (effect.is(xmlTagUpdateEffect)) {
        // Update accumulated widget props by id.
        const { id, value } = effect.value;
        const state = typeof value === 'function' ? value(map[id]) : value;
        return { ...map, [id]: state };
      }
    }

    return map;
  },
});

export type XmlTagsOptions = {
  registry: XmlWidgetRegistry;

  /**
   * Called when widgets are mounted or unmounted.
   */
  setWidgets?: (widgets: XmlWidgetState[]) => void;

  /**
   * Tags to bookmark.
   */
  bookmarks?: string[];
};

/**
 * Extension that adds thread-related functionality including XML tag decorations.
 */
export const xmlTags = ({ registry, setWidgets, bookmarks }: XmlTagsOptions): Extension => {
  // Active widgets.
  // TODO(burdon): Batch.
  // TODO(burdon): Better way to share with outside?
  const widgets = new Map<string, XmlWidgetState>();
  const notifier = {
    mounted: (widget: XmlWidgetState) => {
      widgets.set(widget.id, widget);
      setWidgets?.([...widgets.values()]);
    },
    unmounted: (id: string) => {
      widgets.delete(id);
      setWidgets?.([...widgets.values()]);
    },
  } satisfies XmlWidgetNotifier;

  const widgetDecorationsField = createWidgetDecorationsField(registry, notifier);
  return [
    contextStateField,
    widgetStateField,
    widgetDecorationsField,
    createWidgetUpdatePlugin(widgetDecorationsField, notifier),
    bookmarks?.length
      ? Prec.highest(
          keymap.of([
            {
              key: 'Mod-ArrowUp',
              run: (view) => {
                const cursorPos = view.state.doc.lineAt(view.state.selection.main.head).from;
                let widget: { from: number; to: number; tag: string } | null = null;
                const { decorations } = view.state.field(widgetDecorationsField);
                for (const range of decorationSetToArray(decorations)) {
                  if (range.from < cursorPos) {
                    const tag = range.value.spec.tag;
                    if (bookmarks.includes(tag)) {
                      if (!widget || range.from > widget.from) {
                        widget = { from: range.from, to: range.to, tag };
                      }
                    }
                  }
                }

                const line = view.state.doc.lineAt(widget?.from ?? 0);
                view.dispatch({
                  selection: { anchor: line.from, head: line.from },
                  effects: scrollToLineEffect.of({ line: line.number, options: { offset: -16 } }),
                });

                return true;
              },
            },
            {
              key: 'Mod-ArrowDown',
              run: (view) => {
                const cursorPos = view.state.doc.lineAt(view.state.selection.main.head).to;
                let widget: { from: number; to: number; tag: string } | null = null;
                const { decorations } = view.state.field(widgetDecorationsField);
                for (const range of decorationSetToArray(decorations)) {
                  if (range.from > cursorPos) {
                    const tag = range.value.spec.tag;
                    if (bookmarks.includes(tag)) {
                      if (!widget || range.from < widget.from) {
                        widget = { from: range.from, to: range.to, tag };
                      }
                    }
                  }
                }

                if (widget) {
                  const line = view.state.doc.lineAt(widget?.from);
                  view.dispatch({
                    selection: { anchor: line.to, head: line.to },
                    effects: scrollToLineEffect.of({ line: line.number, options: { offset: -16 } }),
                  });
                } else {
                  const line = view.state.doc.lineAt(view.state.doc.length);
                  view.dispatch({
                    selection: { anchor: line.to, head: line.to },
                    effects: scrollToLineEffect.of({ line: line.number, options: { position: 'end' } }),
                  });
                }

                return true;
              },
            },
          ]),
        )
      : [],
  ];
};

/**
 * Effect processing plugin.
 * Handles widget updates.
 */
const createWidgetUpdatePlugin = (
  widgetDecorationsField: StateField<WidgetDecorationSet>,
  notifier: XmlWidgetNotifier,
) =>
  ViewPlugin.fromClass(
    class {
      update(update: ViewUpdate) {
        const widgetStateMap = update.state.field(widgetStateField);
        const { decorations } = update.state.field(widgetDecorationsField);

        // Check for widget update effects and re-render widgets.
        for (const effect of update.transactions.flatMap((tr) => tr.effects)) {
          if (effect.is(xmlTagUpdateEffect)) {
            const widgetState = widgetStateMap[effect.value.id];

            // Find and render widget.
            for (const range of decorationSetToArray(decorations)) {
              const deco = range.value;
              const widget = deco?.spec?.widget;
              if (widget && widget instanceof PlaceholderWidget && widget.id === effect.value.id && widget.root) {
                const props = { ...widget.props, ...widgetState };
                notifier.mounted({ id: widget.id, props, root: widget.root, Component: widget.Component });
              }
            }
          }
        }
      }
    },
  );

/**
 * Builds and maintains decorations for XML widgets.
 * Must be a StateField because block decorations cannot be provided via ViewPlugin.
 */
const createWidgetDecorationsField = (registry: XmlWidgetRegistry, notifier: XmlWidgetNotifier) =>
  StateField.define<WidgetDecorationSet>({
    create: (state) => {
      return buildDecorations(state, { from: 0, to: state.doc.length }, registry, notifier);
    },
    update: ({ from, decorations }, tr) => {
      // Check for reset effect.
      for (const effect of tr.effects) {
        if (effect.is(xmlTagResetEffect)) {
          return { from: 0, decorations: Decoration.none };
        }
      }

      if (tr.docChanged) {
        const { state } = tr;

        // Flag if the transaction has modified the head of the document.
        const reset = tr.changes.touchesRange(0, from);
        if (reset) {
          // Full rebuild from start.
          return buildDecorations(state, { from: 0, to: state.doc.length }, registry, notifier);
        } else {
          // Append-only: rebuild decorations from after the last widget.
          const result = buildDecorations(state, { from, to: state.doc.length }, registry, notifier);

          // Merge with existing decorations.
          return {
            from: result.from,
            decorations: decorations.update({ add: decorationSetToArray(result.decorations) }),
          };
        }
      }

      return { from, decorations };
    },
    provide: (field) => [
      EditorView.decorations.from(field, (v) => v.decorations),
      EditorView.atomicRanges.of((view) => view.state.field(field).decorations || Decoration.none),
    ],
  });

/**
 * Creates widget decorations for XML tags in the document using the syntax tree.
 */
const buildDecorations = (
  state: EditorState,
  range: Range,
  registry: XmlWidgetRegistry,
  notifier: XmlWidgetNotifier,
): WidgetDecorationSet => {
  const context = state.field(contextStateField, false);
  const widgetStateMap = state.field(widgetStateField, false) ?? {};

  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(state);
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return { from: range.from, decorations: Decoration.none };
  }

  // TODO(burdon): Currently creating new decorations for each transaction?

  let last = 0;
  tree.iterate({
    from: range.from,
    to: range.to,
    enter: (node) => {
      switch (node.type.name) {
        // XML Element.
        case 'Element': {
          try {
            const props = nodeToJson(state, node.node);
            if (props) {
              const def = registry[props._tag];
              if (def) {
                const { block, factory, Component } = def;
                const widgetState = props.id ? widgetStateMap[props.id] : undefined;
                const nodeRange = { from: node.node.from, to: node.node.to };
                const args = { ...widgetState, ...props, context, range: nodeRange } satisfies XmlWidgetProps;

                // Create widget.
                const widget: WidgetType | undefined = factory
                  ? factory(args)
                  : Component
                    ? props.id && new PlaceholderWidget(props.id, Component, args, notifier)
                    : undefined;

                if (widget) {
                  last = nodeRange.from;
                  builder.add(
                    nodeRange.from,
                    nodeRange.to,
                    Decoration.replace({
                      widget,
                      block,
                      atomic: true,
                      inclusive: true,
                      tag: props._tag,
                    }),
                  );
                }
              }
            }
          } catch (err) {
            // TODO(burdon): Track errors.
            log.catch(err);
          }

          // Don't descend into children.
          return false;
        }
      }
    },
  });

  return { from: last, decorations: builder.finish() };
};

/**
 * Placeholder for React widgets.
 */
class PlaceholderWidget<TProps extends XmlWidgetProps> extends WidgetType {
  private _root: HTMLElement | null = null;

  constructor(
    public readonly id: string,
    public readonly Component: FC<TProps>,
    public readonly props: TProps,
    private readonly notifier: XmlWidgetNotifier,
  ) {
    super();
    invariant(id);
  }

  get root() {
    return this._root;
  }

  override eq(other: WidgetType): boolean {
    return other instanceof PlaceholderWidget && this.id === other.id;
  }

  override ignoreEvent() {
    return true;
  }

  override toDOM(_view: EditorView): HTMLElement {
    this._root = document.createElement('span');
    this.notifier.mounted({ id: this.id, props: this.props, root: this._root, Component: this.Component });
    return this._root;
  }

  override destroy(_dom: HTMLElement): void {
    this.notifier.unmounted(this.id);
    this._root = null;
  }
}
