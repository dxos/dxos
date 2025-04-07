//
// Copyright 2025 DXOS.org
//

import { html, svg, LitElement } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { makeId } from '@dxos/react-hooks';

import { type Size } from '../defs';

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type AvatarVariant = 'square' | 'circle';
export type AvatarStatus = 'active' | 'inactive' | 'current' | 'error' | 'warning' | 'internal';
export type AvatarAnimation = 'pulse' | 'none';

const rx = '0.25rem';

export type DxAvatarProps = Partial<
  Pick<
    DxAvatar,
    | 'fallback'
    | 'labelId'
    | 'imgSrc'
    | 'imgCrossOrigin'
    | 'imgReferrerPolicy'
    | 'variant'
    | 'status'
    | 'animation'
    | 'hue'
    | 'size'
    | 'icon'
    | 'viewBoxSize'
    | 'rootClassName'
  >
>;

@customElement('dx-avatar')
export class DxAvatar extends LitElement {
  private maskId: string;

  constructor() {
    super();
    this.maskId = makeId('avatar__mask');
  }

  @property({ type: String })
  fallback: string = 'never';

  @property({ type: String })
  labelId: string = 'never';

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
  animation: AvatarAnimation = 'none';

  @property({ type: String })
  hue: string | undefined = undefined;

  @property({ type: String })
  size: Size = 10;

  @property({ type: String })
  icon: string | undefined = undefined;

  @property({ type: Number })
  viewBoxSize: number = 256;

  @property({ type: String })
  rootClassName: string | undefined = undefined;

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
    const numericSize = this.size === 'px' ? 1 : Number(this.size);
    const sizePx = numericSize * 4;
    const ringWidth = this.status ? (numericSize > 4 ? 2 : numericSize > 3 ? 1 : 1) : 0;
    const ringGap = this.status ? (numericSize > 12 ? 3 : numericSize > 4 ? 2 : numericSize > 3 ? 1 : 0) : 0;
    const viewBoxCoefficient = this.viewBoxSize / sizePx;
    const r = (sizePx / 2 - ringGap - ringWidth) * viewBoxCoefficient;
    const isTextOnly = Boolean(this.fallback && /[0-9a-zA-Z]+/.test(this.fallback));
    const fontScale = (isTextOnly ? 3 : 4) * (1 / 1.56) * viewBoxCoefficient;
    return html`<span
      role="img"
      class=${`dx-avatar${this.rootClassName ? ` ${this.rootClassName}` : ''}`}
      aria-labelledby=${this.labelId}
      data-size=${this.size}
      data-variant=${this.variant}
      data-status=${this.status}
      data-animation=${this.animation}
      data-state-loading-status=${this.loadingStaus}
      >${svg`<svg
        viewBox=${`0 0 ${this.viewBoxSize} ${this.viewBoxSize}`}
        width=${sizePx}
        height=${sizePx}
        class="dx-avatar__frame"
      >
        <defs>
          <mask id=${this.maskId}>
            ${
              this.variant === 'circle'
                ? svg`<circle fill="white" cx=${this.viewBoxSize / 2} cy=${this.viewBoxSize / 2} r=${r} />`
                : svg`<rect
                  fill="white"
                  width=${2 * r}
                  height=${2 * r}
                  x=${(ringGap + ringWidth) * viewBoxCoefficient}
                  y=${(ringGap + ringWidth) * viewBoxCoefficient}
                  rx=${rx}
                />`
            }
          </mask>
        </defs>
        ${
          this.variant === 'circle'
            ? svg` <circle
              cx=${this.viewBoxSize / 2}
              cy=${this.viewBoxSize / 2}
              r=${r}
              fill=${this.hue ? `var(--dx-${this.hue}Fill)` : 'var(--surface-bg)'}
            />`
            : svg` <rect
              fill=${this.hue ? `var(--dx-${this.hue}Fill)` : 'var(--surface-bg)'}
              x=${(ringGap + ringWidth) * viewBoxCoefficient}
              y=${(ringGap + ringWidth) * viewBoxCoefficient}
              width=${2 * r}
              height=${2 * r}
              rx=${rx}
            />`
        }
        ${
          this.imgSrc &&
          svg`<image
          width=${this.viewBoxSize}
          height=${this.viewBoxSize}
          preserveAspectRatio="xMidYMid slice"
          href=${this.imgSrc}
          mask=${`url(#${this.maskId})`}
          crossorigin=${this.imgCrossOrigin}
          @load=${this.handleLoad}
          @error=${this.handleError}
        />`
        }
        ${this.icon && svg`<use href=${this.icon} />`}
        <text
          x=${this.viewBoxSize / 2}
          y=${this.viewBoxSize / 2}
          class="dx-avatar__fallback-text"
          text-anchor="middle"
          alignment-baseline="central"
          font-size=${this.size === 'px' ? '200%' : this.size * fontScale}
          mask=${`url(#${this.maskId})`}
        >
          ${this.fallback}
        </text>
      </svg>`}<span role="none" class="dx-avatar__ring" style=${styleMap({ borderWidth: ringWidth + 'px' })}
    /></span>`;
  }

  override createRenderRoot() {
    return this;
  }
}
