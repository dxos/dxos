//
// Copyright 2026 DXOS.org
//

import { DX_POPOVER_CONTENT_ATTR } from './anchor.ts';

/** Delay before hover opens the preview — long enough that crossing the anchor en route elsewhere does not fire it. */
const HOVER_OPEN_DELAY = 100;

/** Grace period after the pointer leaves the anchor/card before the preview closes, so it can travel between them. */
const HOVER_CLOSE_DELAY = 300;

export type AnchorHoverOptions = {
  /** The element the preview is anchored to; the pointer over it or over the open card keeps the card open. */
  anchor: Element;
  open: () => void;
  close: () => void;
};

/**
 * Hover intent for an element that previews an object in a popover card: opens after a short hover,
 * closes once the pointer has left both the anchor and the card, and stops closing on leave once the
 * reader interacts with the card. Framework-free so `dx-anchor` and React triggers share it.
 */
export class AnchorHover {
  readonly #anchor: Element;
  readonly #open: () => void;
  readonly #close: () => void;

  #openTimer: ReturnType<typeof setTimeout> | undefined;
  #closeTimer: ReturnType<typeof setTimeout> | undefined;

  /** True while a card opened by hover (not click) is showing; only then does leaving dismiss it. */
  #hoverOpen = false;

  constructor({ anchor, open, close }: AnchorHoverOptions) {
    this.#anchor = anchor;
    this.#open = open;
    this.#close = close;
  }

  enter(pointerType?: string): void {
    if (pointerType === 'touch') {
      return;
    }
    this.#cancelClose();
    if (this.#hoverOpen || this.#openTimer !== undefined) {
      return;
    }
    this.#openTimer = setTimeout(() => {
      this.#openTimer = undefined;
      this.#openFromHover();
    }, HOVER_OPEN_DELAY);
  }

  leave(): void {
    this.#cancelOpen();
    if (this.#hoverOpen) {
      this.#scheduleClose();
    }
  }

  blur(): void {
    if (this.#hoverOpen) {
      this.#scheduleClose();
    }
  }

  /** Cancels pending timers and stops tracking the pointer; a card already showing stays open. */
  reset(): void {
    this.#cancelOpen();
    this.#cancelClose();
    this.#hoverOpen = false;
    document.removeEventListener('pointerover', this.#handleDocumentPointerOver);
    document.removeEventListener('pointerdown', this.#handleDocumentPointerDown, { capture: true });
  }

  #openFromHover(): void {
    this.#hoverOpen = true;
    document.addEventListener('pointerover', this.#handleDocumentPointerOver);
    document.addEventListener('pointerdown', this.#handleDocumentPointerDown, { capture: true });
    this.#open();
  }

  #cancelOpen(): void {
    if (this.#openTimer !== undefined) {
      clearTimeout(this.#openTimer);
      this.#openTimer = undefined;
    }
  }

  #cancelClose(): void {
    if (this.#closeTimer !== undefined) {
      clearTimeout(this.#closeTimer);
      this.#closeTimer = undefined;
    }
  }

  #scheduleClose(): void {
    if (this.#closeTimer === undefined) {
      this.#closeTimer = setTimeout(() => {
        this.#closeTimer = undefined;
        this.reset();
        this.#close();
      }, HOVER_CLOSE_DELAY);
    }
  }

  #handleDocumentPointerOver = (event: PointerEvent): void => {
    const target = event.target;
    const inside =
      target instanceof Element && (this.#anchor.contains(target) || !!target.closest(`[${DX_POPOVER_CONTENT_ATTR}]`));
    if (inside) {
      this.#cancelClose();
    } else {
      this.#scheduleClose();
    }
  };

  #handleDocumentPointerDown = (event: PointerEvent): void => {
    // Interacting with the card pins it: content opened from it (a toolbar menu, a dialog) portals
    // outside the card element, so leave-to-close must stop the moment the reader starts using it.
    const target = event.target;
    if (target instanceof Element && target.closest(`[${DX_POPOVER_CONTENT_ATTR}]`)) {
      this.reset();
    }
  };
}
