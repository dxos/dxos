//
// Copyright 2025 DXOS.org
//

import { provide } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { type DevtoolsHook } from '@dxos/client/devtools';

import { type DxContext, dxContext } from './dx-context';

// TODO(thure): Consider moving all this to `lit-ui`.

@customElement('dx-os')
export class DxOs extends LitElement {
  @provide({ context: dxContext })
  @property({ type: Object })
  value: DxContext = {
    theme: {
      themeMode: 'light',
      tx: () => '',
    },
    client: ((window as any).__DXOS__ as DevtoolsHook).client,
    halo: ((window as any).__DXOS__ as DevtoolsHook).halo,
  };

  override render() {
    return html`<slot></slot>`;
  }
}
