//
// Copyright 2025 DXOS.org
//

// TODO(thure): Find a way to instruct ESLint & Prettier to treat any whitespace between tags rendered in the `html` template function as significant.
/* eslint-disable */

import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { AnchorHover, DxAnchorActivate } from '@dxos/ui-types';

// TODO(thure): There is a case (in)sensitivity issue here which is pernicious:
//   Only refactoring the properties here to all-lowercase fixes the binding in `RefField.tsx`, but that
//   should be unnecessary, and it isn’t an issue for `DxAvatar` or `DxGrid`. What’s going on?

@customElement('dx-anchor')
export class DxAnchor extends LitElement {
  @property({ type: String })
  eid: string = '';

  @property({ type: String })
  rootclassname: string | undefined = undefined;

  /** `hover` opens the preview on hover intent (and click); `click` requires a click. */
  @property({ type: String })
  trigger: 'hover' | 'click' = 'hover';

  readonly #hover = new AnchorHover({
    anchor: this,
    open: () => this.#dispatchActivate(),
    close: () => this.#dispatchClose(),
  });

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
      this.addEventListener('blur', this.#handleBlur);
    }
  }

  override disconnectedCallback(): void {
    this.#hover.reset();
    super.disconnectedCallback();
  }

  override createRenderRoot(): this {
    return this;
  }

  #dispatchActivate(): void {
    this.dispatchEvent(new DxAnchorActivate({ eid: this.eid, label: this.textContent ?? '', trigger: this }));
  }

  #dispatchClose(): void {
    this.dispatchEvent(
      new DxAnchorActivate({ eid: this.eid, label: this.textContent ?? '', trigger: this, state: false }),
    );
  }

  #handleClick = (event: MouseEvent | KeyboardEvent): void => {
    // Cmd/Ctrl-click skips the preview and goes straight to the target.
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      this.#hover.reset();
      this.dispatchEvent(
        new DxAnchorActivate({ eid: this.eid, label: this.textContent ?? '', trigger: this, navigate: true }),
      );
      return;
    }

    // A click pins the popover open: dismissal reverts to outside-interaction/Escape.
    this.#hover.reset();
    this.#dispatchActivate();
  };

  #handleKeyDown = (event: KeyboardEvent): void => {
    // role=button on a non-button element gets no native key activation.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#handleClick(event);
    }
  };

  #handlePointerEnter = (event: PointerEvent): void => {
    if (this.trigger === 'hover') {
      this.#hover.enter(event.pointerType);
    }
  };

  #handlePointerLeave = (): void => {
    this.#hover.leave();
  };

  // NOTE: Focus deliberately does NOT open the preview: the popover returns focus to the anchor on
  // every close (Escape, outside click, hover-leave), so a focus-open re-opens what just closed.
  // Keyboard users open with Enter/Space.

  #handleBlur = (): void => {
    this.#hover.blur();
  };
}
