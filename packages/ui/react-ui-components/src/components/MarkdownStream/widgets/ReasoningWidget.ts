//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';

const trail = [
  'absolute z-0 aspect-[2/1] w-16',
  'bg-[radial-gradient(at_100%_50%,_theme(colors.green.700),_transparent_80%)]',
  '[offset-anchor:100%_50%] [offset-path:border-box]',
];

/** Delay after the last content update before hiding the trail. */
const TRAIL_REMOVAL_DELAY_MS = 1_000;

/**
 * One pending removal timer per logical block. Streaming creates a new widget instance each tick;
 * `destroy` may run after the next instance has already scheduled, so we must not clear a newer timer.
 */
const trailRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>();

const createTrailLayers = (): [HTMLElement, HTMLElement] => [
  Domino.of('div').classNames(...trail, 'animate-trail').root,
  Domino.of('div').classNames(...trail, 'animate-trail-offset').root,
];

/**
 * Props used to derive a stable key for a reasoning block across CodeMirror widget rebuilds.
 * CodeMirror does not assign persistent IDs to widgets; streaming re-runs the factory each tick.
 */
export type ReasoningWidgetBlockIdProps = {
  id?: string;
  range?: { from: number; to: number };
};

/**
 * AI reasoning widget.
 */
export class ReasoningWidget extends WidgetType {
  readonly #pos: string;
  /** The timer id last registered for this instance (may differ from the map if superseded). */
  #ownedTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly text: string,
    pos: string | number | undefined,
  ) {
    super();
    this.#pos = pos === undefined || pos === '' ? 'reasoning' : String(pos);
  }

  override eq(other: this) {
    return this.text === other.text && this.#pos === other.#pos;
  }

  override toDOM() {
    return Domino.of('div')
      .classNames('pt-2 pb-4')
      .append(
        Domino.of('div')
          .classNames('relative overflow-hidden p-px rounded-sm border border-subdued-separator')
          .append(
            Domino.of('div')
              .classNames('relative z-10 bg-base-surface rounded-sm text-sm text-description p-2')
              .attributes({ 'data-reasoning-text': '' })
              .text(this.text),
            Domino.of('div').attributes({ 'data-id': this.#pos }),
          ),
      ).root;
  }

  override updateDOM(dom: HTMLElement) {
    // Update only the text leaf; `dom` may be wrapped in an outer shell, and the trail host is a
    // sibling of the text node inside the bordered container — setting `textContent` on the wrong
    // ancestor would remove `[data-id]`.
    dom.querySelector<HTMLElement>('[data-reasoning-text]')?.replaceChildren(this.text);

    const trailHost = dom.querySelector<HTMLElement>('[data-id]');
    if (trailHost?.childElementCount === 0) {
      trailHost.append(...createTrailLayers());
    }

    this.#scheduleTrailRemoval(dom);
    return true;
  }

  override destroy(_dom: HTMLElement) {
    this.#clearOwnedTrailTimer();
  }

  #scheduleTrailRemoval(dom: HTMLElement) {
    const previous = trailRemovalTimers.get(this.#pos);
    if (previous !== undefined) {
      clearTimeout(previous);
    }

    const timerId = setTimeout(() => {
      if (trailRemovalTimers.get(this.#pos) !== timerId) {
        return;
      }
      trailRemovalTimers.delete(this.#pos);
      this.#ownedTimerId = null;
      dom.querySelector<HTMLElement>('[data-id]')?.remove();
    }, TRAIL_REMOVAL_DELAY_MS);

    trailRemovalTimers.set(this.#pos, timerId);
    this.#ownedTimerId = timerId;
  }

  #clearOwnedTrailTimer() {
    const active = trailRemovalTimers.get(this.#pos);
    if (active !== undefined && active === this.#ownedTimerId) {
      clearTimeout(active);
      trailRemovalTimers.delete(this.#pos);
    }
    this.#ownedTimerId = null;
  }
}
