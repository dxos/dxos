//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';
import { type FunctionComponent } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Domino } from '@dxos/ui';

import { type XmlWidgetProps, type XmlWidgetState } from './xml-tags';

export interface XmlWidgetNotifier {
  mounted(widget: XmlWidgetState): void;
  unmounted(id: string): void;
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
export class StubWidget<TProps extends XmlWidgetProps> extends WidgetType {
  #root: HTMLElement | null = null;
  #view: EditorView | undefined;
  // Throttle the (hot) coordsAt trace to at most once per frame.
  #coordsLoggedThisFrame = false;

  constructor(
    readonly id: string,
    readonly Component: FunctionComponent<TProps>,
    readonly props: TProps,
    readonly notifier: XmlWidgetNotifier,
    readonly streaming?: boolean,
    readonly block?: boolean,
    /**
     * Reserved block height (px). Feeds CodeMirror's off-screen viewport estimate and pre-sizes the
     * placeholder so the block occupies its final height before the portaled content resolves —
     * otherwise it collapses to the 24px minimum, causing scroll jitter and a blank on scroll-back.
     */
    readonly blockHeight?: number,
    /** When true, trace the widget's DOM lifecycle to diagnose scroll-cull jitter/jump (see PreviewScrollSurface). */
    readonly debug?: boolean,
  ) {
    super();
    invariant(id);
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
    const range = (this.props as XmlWidgetProps).range;
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
    return this.id === other.id;
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
   * `notifier.reconcile` on the next document change, not by cull. Scoped to known-height blocks so
   * ordinary widgets keep CM's normal virtualization (no unbounded retained portals).
   */
  get #keepAlive(): boolean {
    return !!this.block && this.blockHeight != null;
  }

  override toDOM(view: EditorView) {
    this.#view = view;
    const cached = this.#keepAlive && this.#root != null;
    if (!this.#root) {
      this.#root = this.block ? Domino.of('div').classNames('min-h-[24px]').root : Domino.of('span').root;
      if (this.block && this.blockHeight != null) {
        // Fixed (not min) height: give CM an authoritative, content-independent measurement so an async
        // widget that mounts / re-lays-out later cannot perturb the heightmap (we know the height up
        // front). `overflow: hidden` keeps content that briefly overshoots from changing the measured box.
        this.#root.style.height = `${this.blockHeight}px`;
        this.#root.style.overflow = 'hidden';
      }
    }
    const props = Object.assign({}, this.props, { view }) as TProps;
    this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
    this.#trace(cached ? 'toDOM (reuse cached root)' : 'toDOM (create)', {
      blockHeight: this.blockHeight,
      scrollTop: Math.round(view.scrollDOM.scrollTop),
    });
    this.#measureAfterPaint('toDOM');
    return this.#root;
  }

  override updateDOM(dom: HTMLElement) {
    this.#root = dom;
    const props = Object.assign({}, this.props, { view: this.#view }) as TProps;
    this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
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
    this.notifier.unmounted(this.id);
    this.#root = null;
    this.#view = undefined;
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
