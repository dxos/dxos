//
// Copyright 2025 DXOS.org
//

// TODO(thure): Find a way to instruct ESLint & Prettier to treat any whitespace between tags rendered in the `html` template function as significant.
/* eslint-disable */

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

export class DxAnchorActivate extends Event {
  public readonly refId: string;
  public readonly label: string;
  public readonly trigger: DxAnchor;
  constructor(props: { refId: string; label: string; trigger: DxAnchor }) {
    super('dx-anchor-activate');
    this.refId = props.refId;
    this.label = props.label;
    this.trigger = props.trigger;
  }
}

@customElement('dx-anchor')
export class DxAnchor extends LitElement {

  // TODO(thure): There is a case (in)sensitivity issue here which is pernicious:
  //   Only refactoring the properties here to all-lowercase fixes the binding in `RefField.tsx`, but that
  //   should be unnecessary, and it isn’t an issue for `DxAvatar` or `DxGrid`. What’s going on?

  @property({ type: String })
  refid: string = makeId('dx-anchor');

  @property({ type: String })
  rootclassname: string | undefined = undefined;

  override connectedCallback (): void {
    super.connectedCallback();
    this.tabIndex = 0;
    this.classList.add('dx-focus-ring');
    if(this.rootclassname){
      this.classList.add(this.rootclassname);
    }
    this.setAttribute('role', 'button');

    if (this.getAttribute('data-auto-trigger') === 'true') {
      this.handleActivate({ type: 'auto-trigger' });
    } else {
      this.addEventListener('click', this.handleActivate);
    }
  }

  private handleActivate(event: { type: string }): void {
    this.dispatchEvent(
      new DxAnchorActivate({ refId: this.refid, label: this.textContent ?? '', trigger: this }),
    );
  }

  override createRenderRoot(): this {
    return this;
  }
}
