//
// Copyright 2025 DXOS.org
//

import { syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
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
import { type FunctionComponent } from 'react';

import { log } from '@dxos/log';

import { type Range } from '../../../types';
import { decorationSetToArray, escapeRegExpSource } from '../../../util';
import { crawlerLineEffect } from '../../streaming/scrolling';
import { StubWidget, type XmlWidgetNotifier } from './stub';
import { nodeToJson } from './xml-util';

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
  view?: EditorView;
  range: { from: number; to: number };
  children?: any[];
  context?: TContext;
  onEvent?: XmlEventHandler;
};

/**
 * Factory for creating widgets.
 */
export type XmlWidgetFactory = (props: XmlWidgetProps) => WidgetType | null;

/**
 * Widget registry definition.
 * NOTE: Widgets should NOT use top/bottom margins (it causes unstable measurements while scrolling which leads to jumps).
 * If required, use encapsulated divs with padding instead.
 */
export type XmlWidgetDef = {
  /**
   * Block widget.
   */
  block?: boolean;

  /**
   * When true, the opening tag is flushed immediately and inner content streams character-by-character.
   */
  streaming?: boolean;

  /**
   * Debug only.
   */
  debug?: boolean;

  /**
   * Native widget (rendered inline).
   */
  factory?: XmlWidgetFactory;

  /**
   * React/Solid widget (rendered in portals outside of the editor).
   * Prefer an `id="..."` attribute on the tag so `updateWidget` can target the instance; if omitted,
   * an id is derived from the tag’s document range (non-streaming) or opening position (streaming).
   * Streaming tags use `cm-xml-<from>` so the same portal id is kept when the closing tag arrives.
   */
  Component?: FunctionComponent<XmlWidgetProps>;

  /**
   * URL scheme prefixes that trigger this widget on Link/Image markdown nodes.
   * Example: `[‘dxn:’, ‘echo:’]` matches `[label](dxn:…)` and `![label](echo:…)`.
   * Block widgets are created for Image nodes; inline widgets for Link nodes.
   */
  urlSchemes?: string[];

  /**
   * Reserved block height (px) derived from the widget's props (e.g. parsed from the image label),
   * used to size the placeholder and CodeMirror's viewport estimate before the React content mounts.
   * Only meaningful for block widgets.
   */
  estimatedHeight?: (props: XmlWidgetProps) => number | undefined;
};

export type XmlWidgetRegistry = Record<string, XmlWidgetDef>;

export const getXmlTextChild = (children: any[]): string | null => {
  const child = children?.[0];
  return typeof child === 'string' ? child : null;
};

/** Stable id for portaled React/Solid widgets; explicit `id` on the tag wins for `updateWidget`. */
const xmlWidgetId = (explicit: unknown, fallback: string): string =>
  typeof explicit === 'string' && explicit.length > 0 ? explicit : fallback;

/**
 * Update context.
 */
export const xmlTagContextEffect = StateEffect.define<any>();

/**
 * Reset all state.
 */
export const xmlTagResetEffect = StateEffect.define();

/**
 * Force a full decoration rebuild without a document change — dispatched once background parsing of a
 * long document completes, so blocks past the initial parse window are decorated without needing an edit.
 */
export const xmlTagRebuildEffect = StateEffect.define();

/**
 * Update widget.
 */
export const xmlTagUpdateEffect = StateEffect.define<{ id: string; value: any }>();

type WidgetDecorationSet = {
  from: number;
  /** Start position of an active unclosed streaming tag (for rebuild range). */
  streamingFrom?: number;
  decorations: DecorationSet;
};

type XmlWidgetStateMap = Record<string, any>;

export type XmlWidgetState = {
  id: string;
  root: HTMLElement;
  props: any;
  Component: FunctionComponent<XmlWidgetProps>;
};

export type { XmlWidgetNotifier };

export type XmlTagsOptions = {
  /** Tag registry. */
  registry?: XmlWidgetRegistry;

  /** Tags to bookmark for navigation. */
  bookmarks?: string[];

  /** Called when widgets are mounted or unmounted. */
  setWidgets?: (widgets: XmlWidgetState[]) => void;
};

/**
 * Implements custom XML tags via CodeMirror-native Widgets and portaled React/Solid components.
 *
 * Basic mechanism:
 * - Decorations are created from XML tags that matched the provided Widget registry.
 * - Native widgets are rendered inline.
 * - React/Solid widgets are rendered in portals outside of the editor via the StubWidget.
 * - Widget state can be update via effects.
 *   - NOTE: Widget state may be updated BEFORE the widget is mounted.
 */
export const xmlTags = ({ registry, setWidgets, bookmarks }: XmlTagsOptions = {}): Extension => {
  const debug = registry ? Object.values(registry).some((def) => def.debug) : false;
  const notifier = createWidgetMap(setWidgets, debug);
  const widgetDecorationsField = createWidgetDecorationsField(registry, notifier);

  return [
    widgetContextStateField,
    widgetStateMapStateField,
    widgetDecorationsField,
    createWidgetUpdatePlugin(widgetDecorationsField, notifier),
    createParseCompletionPlugin(),
    createNavigationEffectPlugin(widgetDecorationsField, bookmarks),
    bookmarks?.length ? Prec.highest(keyHandlers) : [],
    debug ? createScrollJumpMonitor() : [],
  ];
};

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

/**
 * Debug-only: flag large single-event scroll deltas (the "jump") so they can be correlated with the
 * widget lifecycle trace. A smooth user scroll produces small per-event deltas; a jump-to-top is one
 * big negative delta to near-zero.
 */
const createScrollJumpMonitor = () => {
  let last = -1;
  return EditorView.domEventHandlers({
    scroll: (_event, view) => {
      const top = view.scrollDOM.scrollTop;
      if (last >= 0 && Math.abs(top - last) > 600) {
        log.warn('xml-tags: scroll jump', {
          from: Math.round(last),
          to: Math.round(top),
          delta: Math.round(top - last),
        });
      }
      last = top;
    },
  });
};

/**
 * Re-decorate once the whole document has parsed. `StateField.create` (and incremental rebuilds) only
 * see the syntax tree parsed so far, so a block past CodeMirror's initial background-parse window is
 * not decorated until some later transaction — previously it appeared only after the first edit. This
 * dispatches a one-shot rebuild when the full tree becomes available (re-armed on each edit).
 */
const createParseCompletionPlugin = () => {
  let rebuiltForLength = -1;
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      rebuiltForLength = -1;
    }
    const length = update.state.doc.length;
    if (rebuiltForLength !== length && syntaxTreeAvailable(update.state, length)) {
      rebuiltForLength = length;
      // Defer: cannot dispatch during an update.
      queueMicrotask(() => update.view.dispatch({ effects: xmlTagRebuildEffect.of(null) }));
    }
  });
};

/**
 * Manages the collection of widgets.
 */
const createWidgetMap = (setWidgets?: (widgets: XmlWidgetState[]) => void, debug = false): XmlWidgetNotifier => {
  const widgets = new Map<string, XmlWidgetState>();

  // TODO(burdon): Batch updates?
  const notifier = {
    mounted: (state: XmlWidgetState) => {
      const isNew = !widgets.has(state.id);
      widgets.set(state.id, state);
      // Only a genuinely new id changes the portal set (blank-frame culprit); re-parents just re-notify.
      if (debug && isNew) {
        log.info('widget-map: mounted', { id: state.id, count: widgets.size });
      }
      setWidgets?.([...widgets.values()]);
    },
    unmounted: (id: string) => {
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

        // Check for widget update effects and re-render widgets.
        for (const effect of update.transactions.flatMap((tr) => tr.effects)) {
          if (effect.is(xmlTagUpdateEffect)) {
            const widgetState = widgetStateMap[effect.value.id];

            // Find and render widget.
            for (const range of decorationSetToArray(decorations)) {
              const deco = range.value;
              const widget = deco?.spec?.widget;

              // NOTE: If the widget has not yet been mounted, then the root will be null.
              if (widget && widget instanceof StubWidget && widget.id === effect.value.id && widget.root) {
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
const createWidgetDecorationsField = (registry: XmlWidgetRegistry = {}, notifier: XmlWidgetNotifier) => {
  // Multiple registry entries may claim the same URL scheme (e.g. one block, one inline).
  const urlSchemeMap: Map<string, [string, XmlWidgetDef][]> = new Map();
  for (const [tag, def] of Object.entries(registry)) {
    for (const scheme of def.urlSchemes ?? []) {
      const existing = urlSchemeMap.get(scheme);
      if (existing) {
        existing.push([tag, def]);
      } else {
        urlSchemeMap.set(scheme, [[tag, def]]);
      }
    }
  }

  return StateField.define<WidgetDecorationSet>({
    create: (state) => {
      return buildDecorations(state, { from: 0, to: state.doc.length }, registry, notifier, urlSchemeMap);
    },
    update: ({ from, streamingFrom, decorations }, tr) => {
      // Check for reset effect.
      for (const effect of tr.effects) {
        if (effect.is(xmlTagResetEffect)) {
          if (tr.docChanged) {
            return buildDecorations(tr.state, { from: 0, to: tr.state.doc.length }, registry, notifier, urlSchemeMap);
          }
          return { from: 0, decorations: Decoration.none };
        }
        // Full rebuild once background parsing has advanced (no document change).
        if (effect.is(xmlTagRebuildEffect)) {
          return buildDecorations(tr.state, { from: 0, to: tr.state.doc.length }, registry, notifier, urlSchemeMap);
        }
      }

      if (tr.docChanged) {
        const { state } = tr;
        // Flag if the transaction has modified the head of the document.
        const reset = tr.changes.touchesRange(0, from);
        if (reset) {
          log('document reset', { from, to: state.doc.length });
          // Full rebuild from start.
          return buildDecorations(state, { from: 0, to: state.doc.length }, registry, notifier, urlSchemeMap);
        } else {
          // Rebuild from the streaming tag start (if active) so the tree walk can detect completion.
          const rebuildFrom = streamingFrom ?? from;
          const result = buildDecorations(
            state,
            { from: rebuildFrom, to: state.doc.length },
            registry,
            notifier,
            urlSchemeMap,
          );
          return {
            from: result.from,
            streamingFrom: result.streamingFrom,
            decorations: decorations.update({
              // Remove old streaming decorations — they are rebuilt each tick.
              filter: (_f, _t, deco) => !deco.spec.streaming,
              add: decorationSetToArray(result.decorations),
            }),
          };
        }
      }

      return { from, streamingFrom, decorations };
    },
    provide: (field) => [
      EditorView.decorations.from(field, (v) => v.decorations),
      EditorView.atomicRanges.of((view) => view.state.field(field).decorations || Decoration.none),
    ],
  });
};

/**
 * Creates widget decorations for XML tags in the document using the syntax tree.
 * After the tree walk, scans for unclosed streaming tags and creates provisional decorations.
 */
const buildDecorations = (
  state: EditorState,
  range: Range,
  registry: XmlWidgetRegistry,
  notifier: XmlWidgetNotifier,
  urlSchemeMap: Map<string, [string, XmlWidgetDef][]>,
): WidgetDecorationSet => {
  const context = state.field(widgetContextStateField, false);
  const widgetStateMap = state.field(widgetStateMapStateField, false) ?? {};
  const builder = new RangeSetBuilder<Decoration>();

  const tree = syntaxTree(state);
  if (!tree || (tree.type.name === 'Program' && tree.length === 0)) {
    return { from: range.from, decorations: Decoration.none };
  }

  let last = range.from;
  let streamingFrom: number | undefined;

  // Per-dxn occurrence counter for position-independent url-scheme widget ids. Keying on document
  // position would change the id on every keystroke above the widget (full rebuild), remounting the
  // portal and flashing the embed; occurrence order is stable because edits above force a full rebuild.
  const dxnOccurrences = new Map<string, number>();

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
                // Skip unclosed streaming elements — the unclosed tag scan handles them.
                if (def.streaming && !node.node.getChild('CloseTag')) {
                  return false;
                }

                // NOTE: The widget state may already have been updated before the widget is mounted.
                const { block, factory, Component } = def;
                const nodeRange = { from: node.node.from, to: node.node.to };
                const widgetId = xmlWidgetId(
                  args.id,
                  def.streaming ? `cm-xml-${nodeRange.from}` : `cm-xml-${nodeRange.from}-${nodeRange.to}`,
                );
                const widgetState = widgetStateMap[widgetId];
                const props = {
                  id: widgetId,
                  range: nodeRange,
                  context,
                  ...args,
                  ...widgetState,
                } satisfies XmlWidgetProps;

                // Create widget. Known-height block widgets get their reserved height so StubWidget's
                // fixed-height keep-alive applies to Component element tags too, not just url-scheme widgets.
                const blockHeight = block ? def.estimatedHeight?.(props) : undefined;
                const widget: WidgetType | undefined = factory
                  ? (factory(props) ?? undefined)
                  : Component
                    ? new StubWidget(widgetId, Component, props, notifier, false, !!block, blockHeight, def.debug)
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

        case 'Image':
        case 'Link': {
          if (urlSchemeMap.size === 0) {
            return false;
          }
          const urlNode = node.node.getChild('URL');
          const markNodes = node.node.getChildren('LinkMark');
          if (!urlNode || markNodes.length < 2) {
            return false;
          }
          const dxn = state.sliceDoc(urlNode.from, urlNode.to);
          const isBlock = node.type.name === 'Image';
          const defs = [...urlSchemeMap.entries()].find(([scheme]) => dxn.startsWith(scheme))?.[1];
          if (!defs) {
            return false;
          }
          const matched = defs.find(([, d]: [string, XmlWidgetDef]) => !!d.block === isBlock);
          if (!matched) {
            return false;
          }
          const [tag, def] = matched;
          const label = state.sliceDoc(markNodes[0].to, markNodes[1].from);
          const nodeRange = { from: node.node.from, to: node.node.to };
          const occurrence = dxnOccurrences.get(dxn) ?? 0;
          dxnOccurrences.set(dxn, occurrence + 1);
          const widgetId = `cm-url-${dxn}-${occurrence}`;
          const widgetState = widgetStateMap[widgetId];
          const props: XmlWidgetProps = {
            id: widgetId,
            _tag: node.type.name === 'Image' ? 'image' : 'link',
            range: nodeRange,
            context,
            label,
            dxn,
            block: isBlock,
            suggest: isBlock,
            ...widgetState,
          };
          const blockHeight = isBlock ? def.estimatedHeight?.(props) : undefined;
          const widget: WidgetType | undefined = def.factory
            ? (def.factory(props) ?? undefined)
            : def.Component
              ? new StubWidget(widgetId, def.Component, props, notifier, false, isBlock, blockHeight, def.debug)
              : undefined;
          if (widget) {
            builder.add(
              nodeRange.from,
              nodeRange.to,
              Decoration.replace({ widget, block: isBlock, atomic: true, inclusive: true, tag }),
            );
            last = nodeRange.to - 1;
          }
          return false;
        }
      }
    },
  });

  // Scan for unclosed streaming tags at the document tail.
  const streamingTagNames = Object.entries(registry)
    .filter(([, def]) => def.streaming)
    .map(([name]) => name)
    // Longest names first so `react-widget` wins over `react` in alternation.
    .sort((a, b) => b.length - a.length);

  if (streamingTagNames.length > 0) {
    const tailText = state.sliceDoc(range.from, range.to);
    const streamingPattern = streamingTagNames.map(escapeRegExpSource).join('|');
    const tagPattern = new RegExp(`<(${streamingPattern})(\\s[^>]*)?>`, 'g');
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(tailText)) !== null) {
      const tagName = match[1];
      const closeTag = `</${tagName}>`;
      const afterOpen = match.index + match[0].length;

      // Only process if there's no closing tag after this opening tag.
      if (tailText.indexOf(closeTag, afterOpen) === -1) {
        const absoluteFrom = range.from + match.index;
        const contentFrom = range.from + afterOpen;
        const innerText = state.sliceDoc(contentFrom, range.to).trim();

        const def = registry[tagName];
        const props: XmlWidgetProps = {
          _tag: tagName,
          context,
          range: { from: absoluteFrom, to: range.to },
          children: innerText ? [innerText] : undefined,
        };

        // Parse attributes from the opening tag.
        const attrPattern = /(\w+)="([^"]*)"/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = attrPattern.exec(match[0])) !== null) {
          props[attrMatch[1]] = attrMatch[2];
        }

        const widgetId = xmlWidgetId(props.id, `cm-xml-${absoluteFrom}`);
        const widgetState = widgetStateMap[widgetId];
        const mergedProps = { ...props, id: widgetId, ...widgetState };

        const widget: WidgetType | undefined = def.factory
          ? (def.factory(mergedProps) ?? undefined)
          : def.Component
            ? new StubWidget(widgetId, def.Component, mergedProps, notifier, true, undefined, undefined, def.debug)
            : undefined;

        if (widget) {
          builder.add(
            absoluteFrom,
            range.to,
            Decoration.replace({
              widget,
              block: def.block,
              atomic: true,
              inclusive: true,
              tag: tagName,
              streaming: true,
              contentFrom,
            }),
          );

          // Set from to just before the streaming tag so next rebuild covers it.
          streamingFrom = absoluteFrom;
          last = absoluteFrom;
        }

        // Only one streaming tag at a time.
        break;
      }
    }
  }

  return { from: last, streamingFrom, decorations: builder.finish() };
};
