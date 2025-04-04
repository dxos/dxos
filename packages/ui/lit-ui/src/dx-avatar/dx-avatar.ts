//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

import { makeId } from '@dxos/react-hooks';

type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

type AvatarVariant = 'square' | 'circle';
type AvatarStatus = 'active' | 'inactive' | 'current' | 'error' | 'warning' | 'internal';
type AvatarAnimation = 'pulse' | 'none';

@customElement('dx-avatar')
export class DxAvatar extends LitElement {
  private labelId: string;
  private descriptionId: string;
  private maskId: string;

  constructor() {
    super();
    this.labelId = makeId('avatar__label');
    this.descriptionId = makeId('avatar__description');
    this.maskId = makeId('avatar__mask');
  }

  @property({ type: String })
  label: string = 'never';

  @property({ type: String })
  imgSrc: string | undefined = undefined;

  @property({ type: String })
  imgCrossOrigin: NonNullable<HTMLImageElement['crossOrigin']> | undefined = undefined;

  @property({ type: String })
  imgReferrerPolicy: HTMLImageElement['referrerPolicy'] | undefined = undefined;

  @property({ type: String })
  variant: AvatarVariant = 'circle';

  @property({ type: String })
  status: AvatarStatus | undefined = undefined;

  @property({ type: String })
  animation: AvatarAnimation | undefined = 'none';

  @property({ type: Boolean })
  inGroup: boolean | undefined = false;

  @property({ type: String })
  hue: string | undefined = undefined;

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
