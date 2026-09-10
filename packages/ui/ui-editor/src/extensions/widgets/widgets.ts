//
// Copyright 2025 DXOS.org
//

// Widgets: syntax-tree ranges replaced by CodeMirror widgets — native ones rendered inline, React/Solid
// ones portaled by the host into a placeholder. This module owns everything after a match: the one
// decoration field (block decorations cannot come from a view plugin), the placeholder lifecycle the
// host renders portals from, widget state and context effects, and bookmark navigation. What is
// matched is a matcher's business: `xmlTags` claims XML elements, `objectLinks` object links.

import { ensureSyntaxTree, syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  Facet,
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  type WidgetType,
  keymap,
} from '@codemirror/view';
import { type SyntaxNodeRef } from '@lezer/common';
import { type FunctionComponent } from 'react';

import { log } from '@dxos/log';

import { type Range } from '../../types';
import { decorationSetToArray } from '../../util';
import { crawlerLineEffect } from '../streaming';
import { StubWidget, type WidgetNotifier } from './stub';

//
// Types
//

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
export interface WidgetStateManager {
  updateWidget<T>(id: string, props: StateDispatch<T>): void;
}

export type WidgetEventHandler<TEvent = any> = (event: TEvent) => void;

/**
 * Props every widget receives: what matched (`_tag`), where, and the host's context.
 */
export type WidgetProps<TProps = any, TContext = any> = TProps & {
  _tag: string;
  view?: EditorView;
  range: Range;
  children?: any[];
  context?: TContext;
  onEvent?: WidgetEventHandler;
};

/**
 * Factory for creating widgets.
 */
export type WidgetFactory<TProps extends WidgetProps = WidgetProps> = (props: TProps) => WidgetType | null;

/**
 * How a match is rendered.
 * NOTE: Widgets should NOT use top/bottom margins (it causes unstable measurements while scrolling which leads to jumps).
 * If required, use encapsulated divs with padding instead.
 */
export type WidgetDef<TProps extends WidgetProps = WidgetProps> = {
  /**
   * Block widget.
   */
  block?: boolean;

  /**
   * Debug only.
   */
  debug?: boolean;

  /**
   * Native widget (rendered inline).
   */
  factory?: WidgetFactory<TProps>;

  /**
   * React/Solid widget (rendered in portals outside of the editor).
   */
  Component?: FunctionComponent<TProps>;

  /**
   * Reserved block height (px) derived from the widget's props (e.g. parsed from the image label),
   * used to size the placeholder and CodeMirror's viewport estimate before the React content mounts.
   * Only meaningful for block widgets.
   */
  estimatedHeight?: (props: TProps) => number | undefined;

  /**
   * How `estimatedHeight` is applied: `fixed` (default) pins the block, `min` treats it as a floor.
   * Use `min` for a widget whose height changes after it mounts — a disclosure, a growing log —
   * since a pinned box cannot open and clips what it holds.
   */
  heightMode?: 'fixed' | 'min';
};

export type WidgetState = {
  id: string;
  root: HTMLElement;
  props: any;
  Component: FunctionComponent<WidgetProps>;
};

export type { WidgetNotifier };

//
// Effects
//

/**
 * Update context.
 */
export const widgetContextEffect = StateEffect.define<any>();

/**
 * Reset all state.
 */
export const widgetResetEffect = StateEffect.define();

/**
 * Force a full decoration rebuild without a document change — dispatched once background parsing of a
 * long document completes, so blocks past the initial parse window are decorated without needing an edit.
 */
export const widgetRebuildEffect = StateEffect.define();

/**
 * Update widget.
 */
export const widgetUpdateEffect = StateEffect.define<{ id: string; value: any }>();

//
// Matchers
//

type WidgetStateMap = Record<string, any>;

/** What a matcher sees for one node of the tree walk. */
export type WidgetMatchContext = {
  state: EditorState;
  context: any;
  widgetStateMap: WidgetStateMap;
  notifier: WidgetNotifier;
  /** Per-build scratch counters, for ids that must not depend on document position. */
  counters: Map<string, number>;
};

/** What a matcher sees for the document tail after the walk. */
export type WidgetTailContext = Omit<WidgetMatchContext, 'counters'> & {
  range: Range;
};

export type WidgetMatch = {
  from: number;
  to: number;
  decoration: Decoration;
  /** Start of an unclosed streaming range, which the next rebuild starts from. */
  streamingFrom?: number;
};

/**
 * Turns syntax nodes into widget decorations. Matchers are contributed by extensions such as
 * `xmlTags` and `objectLinks` and run in the order they are registered.
 */
export type WidgetMatcher = {
  /** Syntax node types this matcher claims; a claimed node is not descended into. */
  nodes: string[];
  /** Whether any of the matcher's widgets is in debug mode. */
  debug?: boolean;
  match: (node: SyntaxNodeRef, ctx: WidgetMatchContext) => WidgetMatch | undefined;
  /** Runs after the walk over the rebuilt range — for markup the parser has not closed yet. */
  tail?: (ctx: WidgetTailContext) => WidgetMatch | undefined;
};

/** Matchers, in registration order. */
export const widgetMatchersFacet = Facet.define<WidgetMatcher, readonly WidgetMatcher[]>({
  combine: (matchers) => matchers,
});

//
// Host
//

export type WidgetHostOptions = {
  /** Tags to bookmark for navigation. */
  bookmarks?: string[];

  /** Called when widgets are mounted or unmounted. */
  setWidgets?: (widgets: WidgetState[]) => void;
};

const widgetHostFacet = Facet.define<WidgetHostOptions, WidgetHostOptions>({
  combine: (options) => ({
    setWidgets: options.find((option) => option.setWidgets)?.setWidgets,
    bookmarks: options.flatMap((option) => option.bookmarks ?? []),
  }),
});

/**
 * The host's side of the widget lifecycle: where portaled widgets are reported, and which tags
 * bookmark navigation jumps between. One per editor, alongside the matchers it hosts.
 */
export const widgetHost = (options: WidgetHostOptions): Extension => widgetHostFacet.of(options);

//
// Widget creation
//

/** Stable id for portaled React/Solid widgets; explicit `id` on the tag wins for `updateWidget`. */
export const widgetId = (explicit: unknown, fallback: string): string =>
  typeof explicit === 'string' && explicit.length > 0 ? explicit : fallback;

export type CreateWidgetOptions<TProps extends WidgetProps> = {
  def: WidgetDef<TProps>;
  id: string;
  props: TProps;
  notifier: WidgetNotifier;
  /** The matched text, so a rebuilt widget with the same id is still replaced when its source changed. */
  signature?: string;
  streaming?: boolean;
};

/**
 * The widget a definition renders for a match: the factory's native widget, or a placeholder the host
 * portals the component into. Undefined when the definition has neither, or the factory declines.
 */
export const createWidget = <TProps extends WidgetProps>({
  def,
  id,
  props,
  notifier,
  signature,
  streaming,
}: CreateWidgetOptions<TProps>): WidgetType | undefined => {
  if (def.factory) {
    return def.factory(props) ?? undefined;
  }
  if (def.Component) {
    // Known-height block widgets get their reserved height so the placeholder's fixed-height
    // keep-alive applies before the component mounts.
    const blockHeight = def.block ? def.estimatedHeight?.(props) : undefined;
    return new StubWidget({
      id,
      Component: def.Component,
      props,
      notifier,
      signature,
      streaming,
      block: !!def.block,
      blockHeight,
      heightMode: def.heightMode,
      debug: def.debug,
    });
  }
  return undefined;
};

//
// State
//

/**
 * Context state.
 */
const widgetContextStateField = StateField.define<any>({
  create: () => undefined,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(widgetContextEffect)) {
        return effect.value;
      }
    }

    return value;
  },
});

/**
 * Widget state management.
 */
const widgetStateMapStateField = StateField.define<WidgetStateMap>({
  create: () => ({}),
  update: (map, tr) => {
    // Reduce over every effect: a transaction may carry several updates (or a reset followed by them),
    // and returning on the first would silently drop the rest.
    let next = map;
    for (const effect of tr.effects) {
      if (effect.is(widgetResetEffect)) {
        next = {};
      } else if (effect.is(widgetUpdateEffect)) {
        // Update accumulated widget props by id.
        const { id, value } = effect.value;
        log('widget updated', { id, value });
        next = { ...next, [id]: typeof value === 'function' ? value(next[id]) : value };
      }
    }

    return next;
  },
});

/**
 * Re-applies the accumulated widget state at mount time.
 *
 * A widget's props are baked when its decoration is built, but state can be dispatched before the
 * widget mounts — rehydration after a document reset targets widgets that are still outside
 * CodeMirror's viewport, and `widgetUpdateEffect` alone rebuilds no decorations. Such a widget would
 * otherwise mount with the stale props it was built with, since `StubWidget.eq` (id equality) stops a
 * later rebuild from replacing the instance.
 */
const withCurrentWidgetState = (state: WidgetState): WidgetState => {
  const view: EditorView | undefined = state.props?.view;
  const widgetState = view?.state.field(widgetStateMapStateField, false)?.[state.id];
  return widgetState ? { ...state, props: { ...state.props, ...widgetState } } : state;
};

/**
 * Manages the collection of widgets.
 */
const createWidgetMap = (setWidgets?: (widgets: WidgetState[]) => void, debug = false): WidgetNotifier => {
  const widgets = new Map<string, WidgetState>();

  // TODO(burdon): Batch updates?
  const notifier = {
    mounted: (rawState: WidgetState) => {
      const state = withCurrentWidgetState(rawState);
      const isNew = !widgets.has(state.id);
      widgets.set(state.id, state);
      // Only a genuinely new id changes the portal set (blank-frame culprit); re-parents just re-notify.
      if (debug && isNew) {
        log.info('widget-map: mounted', { id: state.id, count: widgets.size });
      }
      setWidgets?.([...widgets.values()]);
    },
    updated: (id: string, widgetState: any) => {
      const current = widgets.get(id);
      if (!current || !widgetState) {
        return;
      }

      widgets.set(id, { ...current, props: { ...current.props, ...widgetState } });
      setWidgets?.([...widgets.values()]);
    },
    unmounted: (id: string, root?: HTMLElement | null) => {
      // Stale destroy: a replacement widget (same id) already registered a newer root — CodeMirror
      // draws the replacement before destroying the old instance, and deleting here would orphan
      // the live placeholder with no portal (embeds vanished until a view-mode toggle).
      const current = widgets.get(id);
      if (!current || (root && current.root !== root)) {
        return;
      }
      widgets.delete(id);
      // A cull drops the portal for a frame before it re-mounts — this is the blank-space window.
      if (debug) {
        log.info('widget-map: unmounted', { id, count: widgets.size });
      }
      setWidgets?.([...widgets.values()]);
    },
    reconcile: (liveIds: Set<string>) => {
      let changed = false;
      for (const id of [...widgets.keys()]) {
        if (!liveIds.has(id)) {
          widgets.delete(id);
          changed = true;
        }
      }
      if (changed) {
        if (debug) {
          log.info('widget-map: reconcile pruned', { live: [...liveIds], count: widgets.size });
        }
        setWidgets?.([...widgets.values()]);
      }
    },
  } satisfies WidgetNotifier;

  return notifier;
};

type WidgetDecorationSet = {
  from: number;
  /** Start position of an active unclosed streaming tag (for rebuild range). */
  streamingFrom?: number;
  decorations: DecorationSet;
  /** Created with the field, from the host's `setWidgets`; the update plugin reports through it. */
  notifier: WidgetNotifier;
};

/** Ceiling on parsing ahead of the background parser; past it `parseCompletionPlugin` rebuilds. */
const PARSE_BUDGET = 50;

/**
 * Creates widget decorations over `range` by handing each claimed node to the matchers, then the
 * document tail for markup the parser has not closed yet.
 */
const buildDecorations = (
  state: EditorState,
  range: Range,
  notifier: WidgetNotifier,
  /** Parse ahead of the background parser rather than reading a partial tree — see {@link PARSE_BUDGET}. */
  forceParse = false,
): Omit<WidgetDecorationSet, 'notifier'> => {
  const matchers = state.facet(widgetMatchersFacet);
  const context = state.field(widgetContextStateField, false);
  const widgetStateMap = state.field(widgetStateMapStateField, false) ?? {};
  const builder = new RangeSetBuilder<Decoration>();

  // A fresh view has parsed only about a viewport, so a large payload's `Element` is absent at
  // first paint and its markup renders raw until a rebuild — the flash on a remounted row.
  const tree = (forceParse ? ensureSyntaxTree(state, range.to, PARSE_BUDGET) : null) ?? syntaxTree(state);
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return { from: range.from, decorations: Decoration.none };
  }

  let last = range.from;
  let streamingFrom: number | undefined;
  const ctx: WidgetMatchContext = { state, context, widgetStateMap, notifier, counters: new Map() };

  tree.iterate({
    from: range.from,
    to: range.to,
    enter: (node) => {
      const claimants = matchers.filter((matcher) => matcher.nodes.includes(node.type.name));
      if (claimants.length === 0) {
        return;
      }

      for (const matcher of claimants) {
        try {
          const match = matcher.match(node, ctx);
          if (match) {
            builder.add(match.from, match.to, match.decoration);
            // Track last widget (NOTE: range is inclusive).
            last = match.to - 1;
            break;
          }
        } catch (err) {
          log.catch(err);
        }
      }

      // Don't descend into children.
      return false;
    },
  });

  for (const matcher of matchers) {
    const match = matcher.tail?.({ state, range, context, widgetStateMap, notifier });
    if (match) {
      builder.add(match.from, match.to, match.decoration);
      streamingFrom = match.streamingFrom;
      last = match.from;
      // Only one streaming range at a time.
      break;
    }
  }

  return { from: last, streamingFrom, decorations: builder.finish() };
};

/**
 * Builds and maintains the widget decorations.
 * Must be a StateField because block decorations cannot be provided via ViewPlugin.
 */
const widgetDecorationsField = StateField.define<WidgetDecorationSet>({
  create: (state) => {
    const { setWidgets } = state.facet(widgetHostFacet);
    const debug = state.facet(widgetMatchersFacet).some((matcher) => matcher.debug);
    const notifier = createWidgetMap(setWidgets, debug);
    // Forced only here, so a streamed chunk is not charged for a parse it will get anyway.
    return { ...buildDecorations(state, { from: 0, to: state.doc.length }, notifier, true), notifier };
  },
  update: ({ from, streamingFrom, decorations, notifier }, tr) => {
    const rebuild = (range: Range): WidgetDecorationSet => ({
      ...buildDecorations(tr.state, range, notifier),
      notifier,
    });
    const whole = { from: 0, to: tr.state.doc.length };

    // Check for reset effect.
    for (const effect of tr.effects) {
      if (effect.is(widgetResetEffect)) {
        if (tr.docChanged) {
          return rebuild(whole);
        }
        return { from: 0, decorations: Decoration.none, notifier };
      }
      // Full rebuild once background parsing has advanced (no document change).
      if (effect.is(widgetRebuildEffect)) {
        return rebuild(whole);
      }
      // Widget props capture the context at build time and `StubWidget.eq` compares ids, so a context
      // set after the first build would otherwise never reach a widget — leaving its callbacks bound to
      // `undefined` for the life of the document.
      if (effect.is(widgetContextEffect)) {
        return rebuild(whole);
      }
    }

    if (tr.docChanged) {
      const { state } = tr;
      // Flag if the transaction has modified the head of the document.
      const reset = tr.changes.touchesRange(0, from);
      if (reset) {
        log('document reset', { from, to: state.doc.length });
        // Full rebuild from start.
        return rebuild(whole);
      } else {
        // Rebuild from the streaming tag start (if active) so the tree walk can detect completion.
        const rebuildFrom = streamingFrom ?? from;
        const result = buildDecorations(state, { from: rebuildFrom, to: state.doc.length }, notifier);
        return {
          from: result.from,
          streamingFrom: result.streamingFrom,
          decorations: decorations.update({
            // Remove old streaming decorations — they are rebuilt each tick.
            filter: (_f, _t, deco) => !deco.spec.streaming,
            add: decorationSetToArray(result.decorations),
          }),
          notifier,
        };
      }
    }

    return { from, streamingFrom, decorations, notifier };
  },
  provide: (field) => [
    EditorView.decorations.from(field, (v) => v.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).decorations || Decoration.none),
  ],
});

//
// Plugins
//

/**
 * Debug-only: flag large single-event scroll deltas (the "jump") so they can be correlated with the
 * widget lifecycle trace. A smooth user scroll produces small per-event deltas; a jump-to-top is one
 * big negative delta to near-zero.
 */
const scrollJumpMonitor = (() => {
  let last = -1;
  return EditorView.domEventHandlers({
    scroll: (_event, view) => {
      if (!view.state.facet(widgetMatchersFacet).some((matcher) => matcher.debug)) {
        return;
      }
      const top = view.scrollDOM.scrollTop;
      if (last >= 0 && Math.abs(top - last) > 600) {
        log.warn('widgets: scroll jump', {
          from: Math.round(last),
          to: Math.round(top),
          delta: Math.round(top - last),
        });
      }
      last = top;
    },
  });
})();

/**
 * Re-decorate once the whole document has parsed. `StateField.create` (and incremental rebuilds) only
 * see the syntax tree parsed so far, so a block past CodeMirror's initial background-parse window is
 * not decorated until some later transaction — previously it appeared only after the first edit. This
 * dispatches a one-shot rebuild when the full tree becomes available (re-armed on each edit).
 */
const parseCompletionPlugin = ViewPlugin.fromClass(
  class {
    #rebuiltForLength = -1;

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.#rebuiltForLength = -1;
      }
      const length = update.state.doc.length;
      if (this.#rebuiltForLength !== length && syntaxTreeAvailable(update.state, length)) {
        this.#rebuiltForLength = length;
        // Defer: cannot dispatch during an update.
        queueMicrotask(() => update.view.dispatch({ effects: widgetRebuildEffect.of(null) }));
      }
    }
  },
);

/**
 * Navigation keys; active only when the host bookmarks something.
 */
const keyHandlers = Prec.highest(
  keymap.of([
    {
      key: 'Mod-ArrowUp',
      run: (view) => {
        if (!view.state.facet(widgetHostFacet).bookmarks?.length) {
          return false;
        }
        view.dispatch({ effects: navigatePreviousEffect.of() });
        return true;
      },
    },
    {
      key: 'Mod-ArrowDown',
      run: (view) => {
        if (!view.state.facet(widgetHostFacet).bookmarks?.length) {
          return false;
        }
        view.dispatch({ effects: navigateNextEffect.of() });
        return true;
      },
    },
  ]),
);

/**
 * Effect processing plugin for navigation.
 * Handles navigation up/down effects.
 */
const navigationEffectPlugin = EditorView.updateListener.of((update) => {
  const { bookmarks } = update.state.facet(widgetHostFacet);
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
          effects: crawlerLineEffect.of({ line: line.number - 1, offset: -16 }),
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
            effects: crawlerLineEffect.of({ line: line.number - 1, offset: -16 }),
          });
        } else {
          const line = view.state.doc.lineAt(view.state.doc.length);
          view.dispatch({
            selection: { anchor: line.to, head: line.to },
            effects: crawlerLineEffect.of({ line: line.number - 1, position: 'end' }),
          });
        }

        continue;
      }
    }
  });
});

/**
 * Handles effect that updates widget state.
 */
const widgetUpdatePlugin = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      const widgetStateMap = update.state.field(widgetStateMapStateField);
      const { decorations, notifier } = update.state.field(widgetDecorationsField);

      // Prune widgets orphaned by a rebuild (position-keyed ids change when an edit shifts a node).
      if (update.docChanged) {
        const liveIds = new Set<string>();
        for (const range of decorationSetToArray(decorations)) {
          const widget = range.value?.spec?.widget;
          if (widget instanceof StubWidget) {
            liveIds.add(widget.id);
          }
        }
        notifier.reconcile(liveIds);
      }

      // Re-render widgets whose state changed. Widgets not yet mounted pick their state up at mount
      // time instead (see `withCurrentWidgetState`).
      for (const effect of update.transactions.flatMap((tr) => tr.effects)) {
        if (effect.is(widgetUpdateEffect)) {
          notifier.updated(effect.value.id, widgetStateMap[effect.value.id]);
        }
      }
    }
  },
);

/**
 * The shared machinery every matcher extension includes; one instance, so CodeMirror deduplicates it
 * however many matchers a host registers.
 */
export const widgetsCore: Extension = [
  widgetContextStateField,
  widgetStateMapStateField,
  widgetDecorationsField,
  widgetUpdatePlugin,
  parseCompletionPlugin,
  navigationEffectPlugin,
  keyHandlers,
  scrollJumpMonitor,
];
