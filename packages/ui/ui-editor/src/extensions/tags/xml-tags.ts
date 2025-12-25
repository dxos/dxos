//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
} from '@codemirror/view';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type Range } from '../../types';
import { decorationSetToArray } from '../../util';
import { scrollToLineEffect } from '../scrolling';

import { nodeToJson } from './xml-util';

// TODO(burdon): Factor out agnostic types (React/solid).
type FunctionComponent<P = {}, R = unknown> = (props: P) => R;

/**
 * StateEffect for navigating to previous bookmark.
 */
export const navigatePreviousEffect = StateEffect.define<void>();

/**
 * StateEffect for navigating to next bookmark.
 */
export const navigateNextEffect = StateEffect.define<void>();

/**
 * Dispatch function for updating state.
 */
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
  context?: TContext;
  range?: { from: number; to: number };
  view?: EditorView;
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

  /** React/Solid widget (rendered in portals outside of the editor). */
  Component?: FunctionComponent<XmlWidgetProps>;
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
 * Reset all state.
 */
export const xmlTagResetEffect = StateEffect.define();

/**
 * Update widget.
 */
export const xmlTagUpdateEffect = StateEffect.define<{ id: string; value: any }>();

type WidgetDecorationSet = {
  from: number;
  decorations: DecorationSet;
};

type XmlWidgetStateMap = Record<string, any>;

export type XmlWidgetState = {
  id: string;
  root: HTMLElement;
  props: any;
  Component: FunctionComponent<XmlWidgetProps>;
};

export interface XmlWidgetNotifier {
  mounted(widget: XmlWidgetState): void;
  unmounted(id: string): void;
}

/**
 * Context state.
 */
const widgetContextStateField = StateField.define<any>({
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
const widgetStateMapStateField = StateField.define<XmlWidgetStateMap>({
  create: () => ({}),
  update: (map, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(xmlTagResetEffect)) {
        return {};
      }

      if (effect.is(xmlTagUpdateEffect)) {
        // Update accumulated widget props by id.
        const { id, value } = effect.value;
        log('widget updated', { id, value });
        const state = typeof value === 'function' ? value(map[id]) : value;
        return { ...map, [id]: state };
      }
    }

    return map;
  },
});

export type XmlTagsOptions = {
  /** Tag registry. */
  registry?: XmlWidgetRegistry;

  /** Called when widgets are mounted or unmounted. */
  setWidgets?: (widgets: XmlWidgetState[]) => void;

  /** Tags to bookmark. */
  bookmarks?: string[];
};

/**
 * Implements custom XML tags via CodeMirror-native Widgets and portaled React/Solid components.
 *
 * Basic mechanism:
 * - Decorations are created from XML tags that matched the provided Widget registry.
 * - Native widgets are rendered inline.
 * - React/Solid widgets are rendered in portals outside of the editor via the PlaceholderWidget.
 * - Widget state can be update via effects.
 *   - NOTE: Widget state may be updated BEFORE the widget is mounted.
 */
export const xmlTags = ({ registry, setWidgets, bookmarks }: XmlTagsOptions = {}): Extension => {
  const notifier = createWidgetMap(setWidgets);
  const widgetDecorationsField = createWidgetDecorationsField(registry, notifier);
  return [
    widgetContextStateField,
    widgetStateMapStateField,
    widgetDecorationsField,
    createWidgetUpdatePlugin(widgetDecorationsField, notifier),
    createNavigationEffectPlugin(widgetDecorationsField, bookmarks),
    bookmarks?.length ? Prec.highest(keyHandlers) : [],
  ];
};

/**
 * Manages the collection of widgets.
 */
const createWidgetMap = (setWidgets?: (widgets: XmlWidgetState[]) => void): XmlWidgetNotifier => {
  const widgets = new Map<string, XmlWidgetState>();

  // TODO(burdon): Batch updates?
  const notifier = {
    mounted: (state: XmlWidgetState) => {
      log('widget mounted', { id: state.id, tag: state.props._tag });
      widgets.set(state.id, state);
      setWidgets?.([...widgets.values()]);
    },
    unmounted: (id: string) => {
      const state = widgets.get(id);
      log('widget unmounted', { id, tag: state?.props._tag });
      widgets.delete(id);
      setWidgets?.([...widgets.values()]);
    },
  } satisfies XmlWidgetNotifier;

  return notifier;
};

/**
 * Navigation keys.
 */
const keyHandlers = keymap.of([
  {
    key: 'Mod-ArrowUp',
    run: (view) => {
      view.dispatch({ effects: navigatePreviousEffect.of() });
      return true;
    },
  },
  {
    key: 'Mod-ArrowDown',
    run: (view) => {
      view.dispatch({ effects: navigateNextEffect.of() });
      return true;
    },
  },
]);

/**
 * Effect processing plugin for navigation.
 * Handles navigation up/down effects.
 */
const createNavigationEffectPlugin = (
  widgetDecorationsField: StateField<WidgetDecorationSet>,
  bookmarks?: string[],
) => {
  return EditorView.updateListener.of((update) => {
    update.transactions.forEach((transaction) => {
      for (const effect of transaction.effects) {
        if (effect.is(navigatePreviousEffect)) {
          const view = update.view;
          const cursorPos = view.state.doc.lineAt(view.state.selection.main.head).from;
          let widget: { from: number; to: number; tag: string } | null = null;
          const { decorations } = view.state.field(widgetDecorationsField);
          for (const range of decorationSetToArray(decorations)) {
            if (range.from < cursorPos) {
              const tag = range.value.spec.tag;
              if (bookmarks?.includes(tag)) {
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

          continue;
        }

        if (effect.is(navigateNextEffect)) {
          const view = update.view;
          const cursorPos = view.state.doc.lineAt(view.state.selection.main.head).to;
          let widget: { from: number; to: number; tag: string } | null = null;
          const { decorations } = view.state.field(widgetDecorationsField);
          for (const range of decorationSetToArray(decorations)) {
            if (range.from > cursorPos) {
              const tag = range.value.spec.tag;
              if (bookmarks?.includes(tag)) {
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

          continue;
        }
      }
    });
  });
};

/**
 * Handles effect that updates widget state.
 */
const createWidgetUpdatePlugin = (
  widgetDecorationsField: StateField<WidgetDecorationSet>,
  notifier: XmlWidgetNotifier,
) =>
  ViewPlugin.fromClass(
    class {
      update(update: ViewUpdate) {
        const widgetStateMap = update.state.field(widgetStateMapStateField);
        const { decorations } = update.state.field(widgetDecorationsField);

        // Check for widget update effects and re-render widgets.
        for (const effect of update.transactions.flatMap((tr) => tr.effects)) {
          if (effect.is(xmlTagUpdateEffect)) {
            const widgetState = widgetStateMap[effect.value.id];

            // Find and render widget.
            for (const range of decorationSetToArray(decorations)) {
              const deco = range.value;
              const widget = deco?.spec?.widget;

              // NOTE: If the widget has not yet been mounted, then the root will be null.
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
const createWidgetDecorationsField = (registry: XmlWidgetRegistry = {}, notifier: XmlWidgetNotifier) =>
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
          log('document reset', { from, to: state.doc.length });
          // Full rebuild from start.
          return buildDecorations(state, { from: 0, to: state.doc.length }, registry, notifier);
        } else {
          // Append-only: rebuild decorations from after the last widget and merge with existing decorations.
          const result = buildDecorations(state, { from, to: state.doc.length }, registry, notifier);
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
  const context = state.field(widgetContextStateField, false);
  const widgetStateMap = state.field(widgetStateMapStateField, false) ?? {};
  const builder = new RangeSetBuilder<Decoration>();

  const tree = syntaxTree(state);
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return { from: range.from, decorations: Decoration.none };
  }

  let last = range.from;
  tree.iterate({
    from: range.from,
    to: range.to,
    enter: (node) => {
      switch (node.type.name) {
        // XML Element.
        case 'Element': {
          try {
            const args = nodeToJson(state, node.node);
            if (args) {
              const def = registry[args._tag];
              if (def) {
                // NOTE: The widget state may already have been updated before the widget is mounted.
                const { block, factory, Component } = def;
                const widgetState = args.id ? widgetStateMap[args.id] : undefined;
                const nodeRange = { from: node.node.from, to: node.node.to };
                const props = { context, range: nodeRange, ...args, ...widgetState } satisfies XmlWidgetProps;

                // Create widget.
                const widget: WidgetType | undefined = factory
                  ? factory(props)
                  : Component
                    ? args.id && new PlaceholderWidget(args.id, Component, props, notifier)
                    : undefined;

                // Add decoration.
                if (widget) {
                  builder.add(
                    nodeRange.from,
                    nodeRange.to,
                    Decoration.replace({
                      widget,
                      block,
                      atomic: true,
                      inclusive: true,
                      tag: args._tag,
                    }),
                  );

                  // Track last widget (NOTE: range is inclusive).
                  last = nodeRange.to - 1;
                }
              }
            }
          } catch (err) {
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
 * Placeholder for widgets.
 */
class PlaceholderWidget<TProps extends XmlWidgetProps> extends WidgetType {
  private _root: HTMLElement | null = null;

  constructor(
    public readonly id: string,
    public readonly Component: FunctionComponent<TProps>,
    public readonly props: TProps,
    private readonly notifier: XmlWidgetNotifier,
  ) {
    super();
    invariant(id);
  }

  get root(): HTMLElement | null {
    return this._root;
  }

  override eq(other: this) {
    return this.id === other.id;
  }

  override ignoreEvent() {
    return true;
  }

  override toDOM(_view: EditorView) {
    this._root = document.createElement('span');
    this.notifier.mounted({ id: this.id, root: this._root, props: this.props, Component: this.Component });
    return this._root;
  }

  override destroy(_dom: HTMLElement) {
    this.notifier.unmounted(this.id);
    this._root = null;
  }
}
