//
// Copyright 2025 DXOS.org
//

import { EditorView, WidgetType } from '@codemirror/view';
import { type FunctionComponent } from 'react';

import { invariant } from '@dxos/invariant';
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
 */
export class StubWidget<TProps extends XmlWidgetProps> extends WidgetType {
  #root: HTMLElement | null = null;
  #view: EditorView | undefined;

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
  ) {
    super();
    invariant(id);
  }

  get root(): HTMLElement | null {
    return this.#root;
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

  override toDOM(view: EditorView) {
    this.#view = view;
    this.#root = this.block ? Domino.of('div').classNames('min-h-[24px]').root : Domino.of('span').root;
    if (this.block && this.blockHeight != null) {
      this.#root.style.minHeight = `${this.blockHeight}px`;
    }
    const props = Object.assign({}, this.props, { view }) as TProps;
    this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
    return this.#root;
  }

  override updateDOM(dom: HTMLElement) {
    this.#root = dom;
    const props = Object.assign({}, this.props, { view: this.#view }) as TProps;
    this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
    return true;
  }

  override destroy(_dom: HTMLElement) {
    this.notifier.unmounted(this.id);
    this.#root = null;
    this.#view = undefined;
  }
}
