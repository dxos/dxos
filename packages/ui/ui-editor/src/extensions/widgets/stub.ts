//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';
import { type FunctionComponent } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Domino } from '@dxos/ui';

import { type WidgetProps, type WidgetState } from './widgets.ts';

export interface WidgetNotifier {
  mounted(widget: WidgetState): void;
  /**
   * `root` identifies the destroyed instance: when CodeMirror replaces a widget (same id, `eq`
   * false — e.g. a context rebuild), it draws the NEW widget before destroying the OLD one, so an
   * id-only unmount would wipe the replacement's fresh registration.
   */
  unmounted(id: string, root?: HTMLElement | null): void;
  /**
   * Re-render the mounted widget for `id` with updated props. Keyed by id rather than by widget
   * instance: a rebuild constructs fresh widgets, but `StubWidget.eq` (id equality) makes CodeMirror
   * keep the previously-rendered DOM, so the instance in the decoration set is not the one holding
   * the mounted root.
   */
  updated(id: string, widgetState: Partial<WidgetProps>): void;
  /**
   * Drop any mounted widgets whose id is not in `liveIds`. Needed because CM reuses a widget's DOM
   * via `updateDOM` (without calling `destroy`) when a decoration's widget changes in place, so an
   * id that is no longer present — e.g. a position-keyed id after an edit shifted the node — would
   * otherwise leak a stale portal.
   */
  reconcile(liveIds: Set<string>): void;
}

/**
 * Mounts a DOM placeholder that React portals render into.
 * Uses a block <div> for block widgets and an inline <span> for inline widgets.
 *
 * Culling a large block widget out of the viewport and re-showing it tears down and rebuilds the
 * portal, causing a blank frame + flicker. `#keepAlive` (for known-height blocks) caches `#root` and
 * keeps the portal mounted across culls so CM re-shows the same populated node; `toDOM` also gives the
 * placeholder a fixed height so CM's measurement is authoritative and content-independent.
 *
 * NOTE: This does NOT address the separate scroll-*jump* on large/fast scroll deltas. That was verified
 * (Playwright, both async and plain-sync block stories) to be widget-independent: CM's measure-phase
 * scroll re-anchor correcting its content-height *estimate* when a big scroll delta reveals a lot of
 * not-yet-measured content. Gradual scrolling does not jump. That is general CM heightmap behavior, not
 * fixable here — see upstream CM #1727 (https://code.haverbeke.berlin/codemirror/dev/issues/1727).
 */
export type StubWidgetOptions<TProps> = {
  id: string;
  Component: FunctionComponent<TProps>;
  props: TProps;
  notifier: WidgetNotifier;
  /**
   * The source text the props were built from, verbatim. `eq` consults it because a widget id is not
   * always content-derived: a streaming tag is keyed on its opening position alone (its end moves every
   * tick), so a run that grows in place keeps its id and would otherwise leave CodeMirror holding the
   * instance built from the first chunk. Compared in full rather than hashed: a 32-bit hash collides on
   * pairs as short as `ab`/`bA` (djb2's adjacent-character deltas cancel), and a collision here is a
   * widget frozen at stale props — the bug this exists to prevent.
   */
  signature?: string;
  streaming?: boolean;
  block?: boolean;
  /**
   * Reserved block height (px). Feeds CodeMirror's off-screen viewport estimate and pre-sizes the
   * placeholder so the block occupies its final height before the portaled content resolves —
   * otherwise it collapses to the 24px minimum, causing scroll jitter and a blank on scroll-back.
   */
  blockHeight?: number;
  /**
   * How `blockHeight` is applied. `fixed` (the default) pins the box, which is right when the
   * height is known up front — an image, a chart. `min` makes it a floor, for content that can
   * legitimately grow after it mounts: a disclosure the reader opens is pinned shut by `fixed`,
   * and clipped by its `overflow: hidden`.
   */
  heightMode?: 'fixed' | 'min';
  /** Keep the root and its portal across culls and rebuilds even without a reserved height. */
  keepAlive?: boolean;
  /** When true, trace the widget's DOM lifecycle to diagnose scroll-cull jitter/jump (see PreviewScrollSurface). */
  debug?: boolean;
};

/** Marks the placeholder a portaled widget renders into. */
export const WIDGET_ROOT_ATTRIBUTE = 'data-widget-root';

/**
 * Frees a mounted block's reserved height in place, from any element the widget rendered: the
 * placeholder stops pinning and the editor re-measures, with no decoration rebuild — so nothing is
 * redrawn under the user. Pair with a `LinkWidgetState.intrinsic` report so the next rebuild does
 * not pin it again.
 */
export const releaseBlockHeight = (view: EditorView, element: Element): void => {
  const root = element.closest(`[${WIDGET_ROOT_ATTRIBUTE}]`);
  if (root instanceof HTMLElement && (root.style.height || root.style.minHeight)) {
    root.style.height = '';
    root.style.minHeight = '';
    root.style.overflow = '';
    view.requestMeasure();
  }
};

export class StubWidget<TProps extends WidgetProps> extends WidgetType {
  #root: HTMLElement | null = null;
  #view: EditorView | undefined;
  // Throttle the (hot) coordsAt trace to at most once per frame.
  #coordsLoggedThisFrame = false;

  readonly id: string;
  readonly Component: FunctionComponent<TProps>;
  readonly props: TProps;
  readonly notifier: WidgetNotifier;
  readonly signature?: string;
  readonly streaming?: boolean;
  readonly block?: boolean;
  readonly blockHeight?: number;
  readonly heightMode?: 'fixed' | 'min';
  readonly keepAlive?: boolean;
  readonly debug?: boolean;

  constructor(options: StubWidgetOptions<TProps>) {
    super();
    this.id = options.id;
    this.Component = options.Component;
    this.props = options.props;
    this.notifier = options.notifier;
    this.signature = options.signature;
    this.streaming = options.streaming;
    this.block = options.block;
    this.blockHeight = options.blockHeight;
    this.heightMode = options.heightMode;
    this.keepAlive = options.keepAlive;
    this.debug = options.debug;
    invariant(this.id);
  }

  get root(): HTMLElement | null {
    return this.#root;
  }

  /** Gated lifecycle trace. Enable per-tag via `XmlWidgetDef.debug` to watch the scroll-cull sequence. */
  #trace(event: string, data?: Record<string, unknown>): void {
    if (this.debug) {
      log.info(`stub-widget: ${event}`, { id: this.id, block: this.block, ...data });
    }
  }

  // CodeMirror reserves this height for the block while it is outside the rendered viewport.
  override get estimatedHeight() {
    return this.block && this.blockHeight != null ? this.blockHeight : -1;
  }

  // Report per-position screen coordinates inside the block so CM can anchor scroll correctly. Large
  // block widgets need this alongside `estimatedHeight` (codemirror/dev#761); returning the same rect
  // for every position confuses CM's geometry, so interpolate a vertical position across the widget's
  // range (offset `pos` within `to - from`).
  override coordsAt(dom: HTMLElement, pos: number, side: number) {
    if (!this.block) {
      return null;
    }
    const rect = dom.getBoundingClientRect();
    const range = (this.props as WidgetProps).range;
    const length = range ? range.to - range.from : 0;
    const fraction = length > 0 ? Math.min(1, Math.max(0, pos / length)) : side > 0 ? 1 : 0;
    const y = rect.top + rect.height * fraction;
    if (this.debug) {
      const detached = rect.height === 0 || (rect.top === 0 && rect.bottom === 0);
      // A detached / re-parented node reports a zero rect; feeding that to CM's scroll anchor snaps the
      // viewport to the document top. Flag it so the jump-to-top is attributable in the trace.
      if (detached) {
        log.warn('stub-widget: coordsAt on detached node (zero rect)', {
          id: this.id,
          pos,
          side,
          connected: dom.isConnected,
          rect: { top: rect.top, height: rect.height },
          y,
        });
      } else if (!this.#coordsLoggedThisFrame) {
        // CM consults coordsAt to anchor the scroll; log one sample per frame to correlate with jumps.
        this.#coordsLoggedThisFrame = true;
        requestAnimationFrame(() => {
          this.#coordsLoggedThisFrame = false;
        });
        log.info('stub-widget: coordsAt', {
          id: this.id,
          pos,
          side,
          rect: { top: Math.round(rect.top), height: Math.round(rect.height) },
          y: Math.round(y),
          scrollTop: Math.round(this.#view?.scrollDOM.scrollTop ?? -1),
        });
      }
    }
    return { left: rect.left, right: rect.right, top: y, bottom: y };
  }

  override eq(other: this) {
    if (this.streaming) {
      return false;
    }

    // Context too, not just the id: props are captured at build time, so an id-only comparison makes
    // CodeMirror keep the existing widget (and its stale props) when the host publishes the context
    // after the first build — leaving every widget callback bound to `undefined`.
    // The signature too: an id that does not encode the tag's content (a streaming tag is keyed on
    // its opening position) would otherwise pin the widget to the props of the first chunk, so a run
    // that keeps appending to the same tag never re-renders until the document is rebuilt.
    // `block` too: CodeMirror reuses an equal widget's element, and a block's div must never stand
    // in for an inline span (or the reverse) when a link switches form. Not the reserved height: a
    // host releases a pin on the mounted element (`releaseBlockHeight`), and a rebuild that differed
    // only there would remount every embed for nothing.
    const context = (props: TProps) => (props as WidgetProps).context;
    return (
      this.id === other.id &&
      this.block === other.block &&
      this.signature === other.signature &&
      context(this.props) === context(other.props)
    );
  }

  override ignoreEvent() {
    return true;
  }

  /**
   * Keep the root DOM (and its portal) alive across CM viewport culls, for block widgets whose height
   * we know up front. A cull calls `destroy()` then `toDOM()` on the SAME widget instance; reusing the
   * cached, already-rendered node instead of rebuilding it keeps the block's measured geometry stable
   * across the cull boundary, which sidesteps CM's measure-phase scroll re-anchor (upstream #1727) and
   * the blank/flicker from the portal remounting. Genuine removals (the tag edited out) are pruned by
   * `notifier.reconcile` on the next document change, not by cull. Scoped to known-height blocks and
   * blocks that ask for it, so ordinary widgets keep CM's normal virtualization (no unbounded retained
   * portals). Rebuilds go through the same path: a kept block whose portal would otherwise remount
   * into a fresh root keeps its element, and with it any focus the user has in it.
   */
  get #keepAlive(): boolean {
    return !!this.block && (this.keepAlive === true || this.blockHeight != null);
  }

  override toDOM(view: EditorView) {
    this.#view = view;
    const cached = this.#keepAlive && this.#root != null;
    if (!this.#root) {
      this.#root = this.block ? Domino.of('div').classNames('min-h-[24px]').root : Domino.of('span').root;
      this.#root.setAttribute(WIDGET_ROOT_ATTRIBUTE, '');
      this.#applyBlockHeight(this.#root);
    }

    const props = Object.assign({}, this.props, { view }) as TProps;
    // `WidgetState` erases the specific `TProps` this instance renders with (a heterogeneous list of
    // portaled widgets shares one array element type); `Component` and `props` are still built from
    // the same `TProps` above, so the pairing stays sound despite the erasure.
    this.notifier.mounted({
      id: this.id,
      root: this.#root,
      props,
      Component: this.Component as FunctionComponent<WidgetProps>,
    });
    this.#trace(cached ? 'toDOM (reuse cached root)' : 'toDOM (create)', {
      blockHeight: this.blockHeight,
      scrollTop: Math.round(view.scrollDOM.scrollTop),
    });
    this.#measureAfterPaint('toDOM');
    return this.#root;
  }

  // Called on the REPLACEMENT widget with the outgoing instance's DOM, so `view` arrives as the
  // argument — `#view` is only ever set by this instance's own `toDOM`, which has not run.
  override updateDOM(dom: HTMLElement, view: EditorView) {
    // CodeMirror offers the outgoing DOM to any widget of the same class; a block cannot continue
    // in an inline span (or the reverse), so decline and let `toDOM` build the right element.
    if (this.block !== (dom.tagName === 'DIV')) {
      return false;
    }
    this.#root = dom;
    this.#view = view;
    // The reserved height is this instance's, not the outgoing widget's: a host that released it
    // (`intrinsic`) or set another must not inherit the old pin from the reused element.
    this.#applyBlockHeight(dom);
    const props = Object.assign({}, this.props, { view }) as TProps;
    this.notifier.mounted({
      id: this.id,
      root: this.#root,
      props,
      Component: this.Component as FunctionComponent<WidgetProps>,
    });
    this.#trace('updateDOM (reuse/re-parent)', { connected: dom.isConnected });
    this.#measureAfterPaint('updateDOM');
    return true;
  }

  override destroy(_dom: HTMLElement) {
    if (this.#keepAlive) {
      // Cull, not removal: keep #root and the portal mounted so the next toDOM re-shows the identical,
      // already-rendered node. `notifier.reconcile` drops it if the tag is genuinely removed.
      this.#trace('destroy (cull, keep-alive)', { scrollTop: Math.round(this.#view?.scrollDOM.scrollTop ?? -1) });
      return;
    }

    this.#trace('destroy (cull)', { scrollTop: Math.round(this.#view?.scrollDOM.scrollTop ?? -1) });
    this.notifier.unmounted(this.id, this.#root ?? _dom);
    this.#root = null;
    this.#view = undefined;
  }

  /** Pins, floors, or frees the block per `blockHeight`/`heightMode`; a no-op for inline widgets. */
  #applyBlockHeight(root: HTMLElement): void {
    if (!this.block) {
      return;
    }
    const pinned = this.blockHeight != null && this.heightMode !== 'min';
    const floored = this.blockHeight != null && this.heightMode === 'min';
    // A floor rather than a pin: the box cannot be measured empty while its portaled content is
    // still to paint, and can still grow when that content changes size.
    root.style.minHeight = floored ? `${this.blockHeight}px` : '';
    // Fixed (not min) height: give CM an authoritative, content-independent measurement so an async
    // widget that mounts / re-lays-out later cannot perturb the heightmap (we know the height up
    // front). `overflow: hidden` keeps content that briefly overshoots from changing the measured box.
    root.style.height = pinned ? `${this.blockHeight}px` : '';
    root.style.overflow = pinned ? 'hidden' : '';
  }

  /**
   * After the next paint, compare the measured block height against the reserved `estimatedHeight`.
   * A large discrepancy is what shifts CM's total-height model and drives the scroll jump; logging it
   * pinpoints when (and by how much) the portaled content diverges from the reserved space.
   */
  #measureAfterPaint(source: string): void {
    if (!this.debug || !this.block) {
      return;
    }

    const root = this.#root;
    requestAnimationFrame(() => {
      if (!root) {
        return;
      }

      const measured = root.getBoundingClientRect().height;
      const reserved = this.blockHeight ?? -1;
      log.info(`stub-widget: measured after ${source}`, {
        id: this.id,
        reserved,
        measured,
        delta: reserved > 0 ? measured - reserved : undefined,
        connected: root.isConnected,
      });
    });
  }
}
