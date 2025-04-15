//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

export class DxTagPickerItemClick extends Event {
  public readonly itemId: string;
  public readonly action: 'remove' | 'activate';
  constructor(props: { itemId: string; action: 'remove' | 'activate' }) {
    super('dx-tag-picker-item-click');
    this.itemId = props.itemId;
    this.action = props.action;
  }
}

@customElement('dx-tag-picker-item')
export class DxTagPickerItem extends LitElement {
  // TODO(thure): Get Hue type used in theme.
  @property({ type: String })
  hue: string = 'neutral';

  @property({ type: String })
  itemId: string = makeId('dx-tag-picker-item');

  @property({ type: String })
  label: string = 'never';

  @property({ type: String })
  removeLabel: string | undefined = undefined;

  private handleClickActivate() {
    this.dispatchEvent(new DxTagPickerItemClick({ itemId: this.itemId, action: 'activate' }));
  }

  private handleClickRemove() {
    this.dispatchEvent(new DxTagPickerItemClick({ itemId: this.itemId, action: 'remove' }));
  }

  override render() {
    return html`<span class="dx-tag" data-hue=${this.hue} id=${this.id}
      ><button @click=${this.handleClickActivate}>${this.label}</button>${this.removeLabel &&
      html`<button aria-label=${this.removeLabel} @click=${this.handleClickRemove}>
        <dx-icon icon="ph--x--regular" />
      </button>`}</span
    >`;
  }
}
