//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type ComponentType, type FC } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { decorationSetToArray } from '../../util';

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
  _tag: string;
  context: TContext;
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
  Component: ComponentType<any>;
};

export interface XmlWidgetNotifier {
  mounted(widget: XmlWidgetState): void;
  unmounted(id: string): void;
}

export type XmlTagsOptions = {
  registry?: XmlWidgetRegistry;
  /**
   * Called when a widget is mounted or unmounted.
   */
  setWidgets?: (widgets: XmlWidgetState[]) => void;
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
  // Active widgets.
  //
  const widgets = new Map<string, XmlWidgetState>();
  const notifier = {
    mounted: (widget: XmlWidgetState) => {
      widgets.set(widget.id, widget);
      options.setWidgets?.([...widgets.values()]);
    },
    unmounted: (id: string) => {
      widgets.delete(id);
      options.setWidgets?.([...widgets.values()]);
    },
  } satisfies XmlWidgetNotifier;

  //
  // Widget decorations.
  //
  const decorationsState = StateField.define<WidgetDecorationSet>({
    create: (state) => {
      return buildDecorations(
        state,
        0,
        state.doc.length,
        state.field(contextState),
        state.field(widgetState),
        options,
        notifier,
      );
    },
    update: ({ from, decorations }, tr) => {
      for (const effect of tr.effects) {
        if (effect.is(xmlTagResetEffect)) {
          return { from: 0, decorations: Decoration.none };
        }
      }

      if (tr.docChanged) {
        const { state } = tr;

        // Flag if the transaction has modified the head of the document.
        // (i.e., any changes that touch before the current `from` position).
        const reset = tr.changes.touchesRange(0, from);

        // Since append-only, rebuild decorations from after the last widget.
        const result = buildDecorations(
          state,
          reset ? 0 : from,
          state.doc.length,
          state.field(contextState),
          state.field(widgetState),
          options,
          notifier,
        );

        // Merge with existing decorations.
        return {
          from: result.from,
          decorations: decorations.update({ add: decorationSetToArray(result.decorations) }),
        };
      }

      // No document changes: avoid mapping decorations through an empty ChangeSet,
      // which can throw when the decoration set was created for a different base length.
      // Simply return the existing decorations unchanged.
      return { from, decorations };
    },
    provide: (field) => [
      EditorView.decorations.from(field, (v) => v.decorations),
      EditorView.atomicRanges.of((view) => view.state.field(field).decorations || Decoration.none),
    ],
  });

  //
  // Widget state management.
  //
  const widgetState = StateField.define<XmlWidgetStateMap>({
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

          // Find and render widget.
          const { decorations } = tr.state.field(decorationsState);
          for (const range of decorationSetToArray(decorations)) {
            const deco = range.value;
            const widget = deco?.spec?.widget;
            if (widget && widget instanceof PlaceholderWidget && widget.id === effect.value.id && widget.root) {
              const props = { ...widget.props, ...state };
              notifier.mounted({ id: widget.id, props, root: widget.root, Component: widget.Component });
            }
          }

          return { ...map, [id]: state };
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
  widgetState: XmlWidgetStateMap,
  options: XmlTagsOptions,
  notifier: XmlWidgetNotifier,
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
            if (options.registry) {
              const props = nodeToJson(state, node.node);
              if (props) {
                const def = options.registry[props._tag];
                if (def) {
                  const { block, factory, Component } = def;
                  const state = props.id ? widgetState[props.id] : undefined;
                  const args = { context, ...props, ...state };
                  const widget: WidgetType | undefined = factory
                    ? factory(args)
                    : Component
                      ? props.id && new PlaceholderWidget(props.id, Component, args, notifier)
                      : undefined;

                  if (widget) {
                    from = node.node.to;
                    builder.add(
                      node.node.from,
                      node.node.to,
                      Decoration.replace({
                        widget,
                        block,
                        atomic: true,
                        inclusive: true,
                      }),
                    );
                  }
                }
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

/**
 * Placeholder for React widgets.
 */
class PlaceholderWidget<TProps = {}> extends WidgetType {
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
