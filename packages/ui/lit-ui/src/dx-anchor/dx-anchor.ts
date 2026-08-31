//
// Copyright 2025 DXOS.org
//

// TODO(thure): Find a way to instruct ESLint & Prettier to treat any whitespace between tags rendered in the `html` template function as significant.
/* eslint-disable */

import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { DX_POPOVER_CONTENT_ATTR, DxAnchorActivate } from '@dxos/ui-types';

/** Delay before hover opens the preview — long enough that crossing the anchor en route elsewhere does not fire it. */
const HOVER_OPEN_DELAY = 400;

/** Grace period after the pointer leaves the anchor/card before the preview closes, so it can travel between them. */
const HOVER_CLOSE_DELAY = 300;

// TODO(thure): There is a case (in)sensitivity issue here which is pernicious:
//   Only refactoring the properties here to all-lowercase fixes the binding in `RefField.tsx`, but that
//   should be unnecessary, and it isn’t an issue for `DxAvatar` or `DxGrid`. What’s going on?

@customElement('dx-anchor')
export class DxAnchor extends LitElement {
  @property({ type: String })
  dxn: string = '';

  @property({ type: String })
  rootclassname: string | undefined = undefined;

  /** `hover` opens the preview on hover intent (and click); `click` requires a click. */
  @property({ type: String })
  trigger: 'hover' | 'click' = 'hover';

  #openTimer: ReturnType<typeof setTimeout> | undefined;
  #closeTimer: ReturnType<typeof setTimeout> | undefined;

  /** True while a popover opened by hover (not click) is showing; only then does leaving dismiss it. */
  #hoverOpen = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.tabIndex = 0;
    this.classList.add(this.getAttribute('data-visible-focus') === 'false' ? 'outline-hidden' : 'dx-focus-ring');
    if (this.rootclassname) {
      this.classList.add(this.rootclassname);
    }
    this.setAttribute('role', 'button');

    if (this.getAttribute('data-auto-trigger') === 'true') {
      this.#dispatchActivate();
    } else {
      this.addEventListener('click', this.#handleClick);
      this.addEventListener('keydown', this.#handleKeyDown);
      this.addEventListener('pointerenter', this.#handlePointerEnter);
      this.addEventListener('pointerleave', this.#handlePointerLeave);
      this.addEventListener('focus', this.#handleFocus);
      this.addEventListener('blur', this.#handleBlur);
    }
  }

  override disconnectedCallback(): void {
    this.#reset();
    super.disconnectedCallback();
  }

  override createRenderRoot(): this {
    return this;
  }

  #dispatchActivate(): void {
    this.dispatchEvent(new DxAnchorActivate({ dxn: this.dxn, label: this.textContent ?? '', trigger: this }));
  }

  #dispatchClose(): void {
    this.#reset();
    this.dispatchEvent(
      new DxAnchorActivate({ dxn: this.dxn, label: this.textContent ?? '', trigger: this, state: false }),
    );
  }

  #reset(): void {
    this.#cancelOpen();
    this.#cancelClose();
    this.#hoverOpen = false;
    document.removeEventListener('pointerover', this.#handleDocumentPointerOver);
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
        this.#dispatchClose();
      }, HOVER_CLOSE_DELAY);
    }
  }

  #openFromHover(): void {
    this.#hoverOpen = true;
    // Track where the pointer travels while hover-open: over the anchor or the card keeps it open.
    document.addEventListener('pointerover', this.#handleDocumentPointerOver);
    this.#dispatchActivate();
  }

  #handleClick = (): void => {
    // A click pins the popover open: dismissal reverts to outside-interaction/Escape.
    this.#reset();
    this.#dispatchActivate();
  };

  #handleKeyDown = (event: KeyboardEvent): void => {
    // role=button on a non-button element gets no native key activation.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#handleClick();
    }
  };

  #handlePointerEnter = (event: PointerEvent): void => {
    if (this.trigger !== 'hover' || event.pointerType === 'touch') {
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
  };

  #handlePointerLeave = (): void => {
    this.#cancelOpen();
    if (this.#hoverOpen) {
      this.#scheduleClose();
    }
  };

  #handleFocus = (): void => {
    // Keyboard focus opens like a hover (mouse focus is covered by the pointer/click paths).
    if (this.trigger === 'hover' && !this.#hoverOpen && this.matches(':focus-visible')) {
      this.#openFromHover();
    }
  };

  #handleBlur = (): void => {
    if (this.#hoverOpen) {
      this.#scheduleClose();
    }
  };

  #handleDocumentPointerOver = (event: PointerEvent): void => {
    const target = event.target;
    const inside =
      target instanceof Element && (this.contains(target) || !!target.closest(`[${DX_POPOVER_CONTENT_ATTR}]`));
    if (inside) {
      this.#cancelClose();
    } else {
      this.#scheduleClose();
    }
  };
}
