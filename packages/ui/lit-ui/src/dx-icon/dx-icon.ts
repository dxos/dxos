//
// Copyright 2025 DXOS.org
//

import { LitElement, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { type Size } from '../defs';

// Shared with @dxos/react-ui's IconRegistry; see IconRegistry.tsx for the bridge contract.
const REGISTRY_GLOBAL = '__dxIconRegistry';

type IconRegistry = {
  hasIcon(name: string): boolean;
  requestIcon(name: string): void;
};

type RegistryHost = { [REGISTRY_GLOBAL]?: IconRegistry };

const getRegistry = (): IconRegistry | undefined => (globalThis as unknown as RegistryHost)[REGISTRY_GLOBAL];

@customElement('dx-icon')
export class DxIcon extends LitElement {
  // TODO(thure): Get Hue type used in theme.
  @property({ type: String })
  size: Size = 4;

  @property({ type: String })
  icon: string = 'ph--circle-dashed--regular';

  // Retained for backwards compatibility with consumers that set it; no longer used.
  @property({ type: Boolean })
  noCache: boolean = true;

  override render() {
    const registry = getRegistry();
    if (registry && !registry.hasIcon(this.icon)) {
      registry.requestIcon(this.icon);
    }
    const href = `#${this.icon}`;
    return svg`<svg class="dx-icon" data-size=${this.size}><use href=${href} /></svg>`;
  }

  override createRenderRoot(): this {
    return this;
  }
}
