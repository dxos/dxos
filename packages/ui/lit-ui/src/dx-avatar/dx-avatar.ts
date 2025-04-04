//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

@customElement('dx-avatar')
export class DxAvatar extends LitElement {
  @property({ type: String })
  label: string = 'never';

  @property({ type: String })
  imgSrc: string | undefined = undefined;

  @property({ type: String })
  imgCrossOrigin: NonNullable<HTMLImageElement['crossOrigin']> | undefined = undefined;

  @property({ type: String })
  imgReferrerPolicy: HTMLImageElement['referrerPolicy'] | undefined = undefined;

  @state()
  loadingStaus: ImageLoadingStatus = 'idle';

  override connectedCallback() {
    super.connectedCallback();
    this.loadingStaus = this.imgSrc ? 'loading' : 'idle';
  }

  override willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('imgSrc')) {
      this.loadingStaus = changedProperties.get('imgSrc') ? 'loading' : 'idle';
    }
  }

  private handleLoad() {
    this.loadingStaus = 'loaded';
  }

  private handleError() {
    this.loadingStaus = 'error';
  }

  override render() {
    return html`<span class="dx-avatar"
      >${this.imgSrc &&
      html`<img
        alt=${this.label}
        src=${this.imgSrc}
        ?crossorigin=${this.imgCrossOrigin}
        ?referrerpolicy=${this.imgReferrerPolicy}
        @load=${this.handleLoad}
        @error=${this.handleError}
      />`}</span
    >`;
  }

  override createRenderRoot() {
    return this;
  }
}
