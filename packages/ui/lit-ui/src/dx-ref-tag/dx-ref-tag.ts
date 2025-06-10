//
// Copyright 2025 DXOS.org
//

// TODO(thure): Find a way to instruct ESLint & Prettier to treat any whitespace between tags rendered in the `html` template function as significant.
/* eslint-disable */

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

export class DxRefTagActivate extends Event {
  public readonly refId: string;
  public readonly label: string;
  public readonly trigger: DxRefTag;
  constructor(props: { refId: string; label: string; trigger: DxRefTag }) {
    super('dx-ref-tag-activate');
    this.refId = props.refId;
    this.label = props.label;
    this.trigger = props.trigger;
  }
}

@customElement('dx-ref-tag')
export class DxRefTag extends LitElement {
  @property({ type: String })
  refId: string = makeId('dx-ref-tag');

  @property({ type: String })
  rootClassName: string | undefined = undefined;

  constructor () {
    super();
    this.addEventListener('click', this.handleActivate);
  }

  override connectedCallback () {
    super.connectedCallback();
    this.tabIndex = 0;
    this.classList.add('dx-focus-ring');
    if(this.rootClassName){
      this.classList.add(this.rootClassName);
    }
    this.setAttribute('role', 'button');
  }

  private handleActivate(event: { type: string }) {
    this.dispatchEvent(
      new DxRefTagActivate({ refId: this.refId, label: this.textContent ?? '', trigger: this }),
    );
  }

  override createRenderRoot() {
    return this;
  }
}
