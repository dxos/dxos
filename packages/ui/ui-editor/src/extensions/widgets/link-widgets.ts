//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, Facet } from '@codemirror/state';
import { Decoration, type EditorView } from '@codemirror/view';

import {
  type WidgetDef,
  type WidgetMatcher,
  type WidgetProps,
  createWidget,
  getWidgetState,
  widgetMatchersFacet,
  widgetRebuildEffect,
  widgetsCore,
  widgetUpdateEffect,
} from './widgets.ts';

/** Decides whether a link's URL is one of this matcher's. */
export type LinkMatch = (url: string) => boolean;

/**
 * Every registered link matcher, so the rest of the editor can tell a link a widget will replace
 * from one it should render itself: `decorateMarkdown` leaves the former alone.
 */
export const linkMatchFacet = Facet.define<LinkMatch, readonly LinkMatch[]>({
  combine: (matchers) => matchers,
});

/** Whether some registered link widget claims the URL. */
export const isWidgetLink = (state: EditorState, url: string): boolean =>
  state.facet(linkMatchFacet).some((match) => match(url));

/** Matches URLs by scheme prefix: `matchSchemes(['dxn:', 'echo:'])`. */
export const matchSchemes =
  (schemes: string[]): LinkMatch =>
  (url) =>
    schemes.some((scheme) => url.startsWith(scheme));

/** Matches http(s) URLs by host, subdomains included: `matchHosts(['github.com'])`. */
export const matchHosts =
  (hosts: string[]): LinkMatch =>
  (url) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    // A host names a web resource: `ftp://github.com/…` is not the widget's.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const { hostname } = parsed;
    return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  };

/** Matches URLs against a pattern: `matchPattern(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/)`. */
export const matchPattern =
  (pattern: RegExp): LinkMatch =>
  (url) => {
    // A sticky or global pattern carries `lastIndex` between calls, alternating its answer.
    pattern.lastIndex = 0;
    return pattern.test(url);
  };

/** What a link widget can report back about its target (see {@link setLinkWidgetState}). */
export type LinkWidgetState = {
  /**
   * The target cannot be resolved (deleted, or never reachable): the link is rendered as its
   * source text, editable, with the widget inline after it instead of replacing it.
   */
  unresolved?: boolean;
  /** The widget sizes itself; no reserved height is applied to the block. */
  intrinsic?: boolean;
};

/** Props of a widget standing in for `[label](url)` or `![label](url)`. */
export type LinkWidgetProps<TContext = unknown> = WidgetProps<
  LinkWidgetState & {
    id: string;
    label: string;
    url: string;
    block: boolean;
    suggest: boolean;
  },
  TContext
>;

/**
 * Reports a link widget's target state: an `unresolved` block becomes an inline widget after
 * editable source, and `intrinsic` builds without a reserved height. With `rebuild` (the default)
 * the decorations are rebuilt so it takes effect now; without it the state applies at the next
 * rebuild, for a change the widget applies to its own element meanwhile (see
 * {@link releaseBlockHeight}) — a redraw under the user's pointer can swap the element they are
 * clicking. Idempotent: a report that changes nothing is skipped, so a widget may call it from a
 * render effect.
 */
export const setLinkWidgetState = (
  view: EditorView,
  id: string,
  state: LinkWidgetState,
  { rebuild = true }: { rebuild?: boolean } = {},
): void => {
  const current = getWidgetState(view.state, id) ?? {};
  const keys = Object.keys(state) as (keyof LinkWidgetState)[];
  if (keys.every((key) => (current[key] ?? false) === state[key])) {
    return;
  }
  view.dispatch({
    effects: [
      widgetUpdateEffect.of({ id, value: (prev) => ({ ...prev, ...state }) }),
      ...(rebuild ? [widgetRebuildEffect.of(null)] : []),
    ],
  });
};

export type LinkWidgetsOptions<TProps extends LinkWidgetProps = LinkWidgetProps> = {
  /** Which URLs are this matcher's. */
  match: LinkMatch;
  /** The inline widget for `[label](url)`. */
  link?: WidgetDef<TProps>;
  /** The block widget for `![label](url)`. */
  image?: WidgetDef<TProps>;
  /**
   * The widget's props from the link's — how a matcher names what it parsed out of the URL for the
   * widget it hands them to (`eid` for an object link). Identity when absent.
   */
  props?: (props: LinkWidgetProps) => TProps;
};

/**
 * Markdown links as widgets: a link whose URL the matcher accepts is replaced by the inline widget,
 * an image by the block one. Several `linkWidgets` may be registered; the first to accept a URL
 * renders it.
 */
export function linkWidgets(options: LinkWidgetsOptions): Extension;
export function linkWidgets<TProps extends LinkWidgetProps>(
  options: LinkWidgetsOptions<TProps> & { props: (props: LinkWidgetProps) => TProps },
): Extension;
export function linkWidgets({ match, link, image, props: toProps }: LinkWidgetsOptions): Extension {
  const matcher: WidgetMatcher = {
    nodes: ['Link', 'Image'],
    debug: link?.debug || image?.debug,
    match: (node, { state, context, widgetStateMap, notifier, counters }) => {
      const urlNode = node.node.getChild('URL');
      const markNodes = node.node.getChildren('LinkMark');
      if (!urlNode || markNodes.length < 2) {
        return undefined;
      }
      const url = state.sliceDoc(urlNode.from, urlNode.to);
      if (!match(url)) {
        return undefined;
      }
      const isBlock = node.type.name === 'Image';
      const def = isBlock ? image : link;
      if (!def) {
        return undefined;
      }

      const label = state.sliceDoc(markNodes[0].to, markNodes[1].from);
      if (!label) {
        return undefined;
      }
      const range = { from: node.node.from, to: node.node.to };
      // Ids count occurrences of a URL rather than positions: keyed on position, every keystroke above
      // a widget would rename it and remount its portal; occurrence order is stable because edits above
      // force a full rebuild.
      const occurrence = counters.get(url) ?? 0;
      counters.set(url, occurrence + 1);
      const id = `cm-url-${url}-${occurrence}`;
      const linkProps: LinkWidgetProps = {
        id,
        _tag: isBlock ? 'image' : 'link',
        range,
        context,
        label,
        url,
        block: isBlock,
        suggest: isBlock,
        ...widgetStateMap[id],
      };
      const props = toProps ? toProps(linkProps) : linkProps;
      const signature = state.sliceDoc(range.from, range.to);
      // An unresolved target: the source stays, editable, and the widget follows it inline.
      if (linkProps.unresolved) {
        const widget = createWidget({
          def: { ...def, block: false, estimatedHeight: undefined },
          id,
          props,
          notifier,
          signature,
        });
        if (!widget) {
          return undefined;
        }
        return {
          from: range.to,
          to: range.to,
          decoration: Decoration.widget({ widget, side: 1, tag: props._tag }),
        };
      }
      const widget = createWidget({
        def: { ...def, block: isBlock, estimatedHeight: linkProps.intrinsic ? undefined : def.estimatedHeight },
        id,
        props,
        notifier,
        signature,
      });
      if (!widget) {
        return undefined;
      }
      return {
        ...range,
        decoration: Decoration.replace({ widget, block: isBlock, atomic: true, inclusive: true, tag: props._tag }),
      };
    },
  };

  return [widgetsCore, widgetMatchersFacet.of(matcher), linkMatchFacet.of(match)];
}
