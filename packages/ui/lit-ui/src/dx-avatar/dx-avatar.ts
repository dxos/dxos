//
// Copyright 2025 DXOS.org
//

import { LitElement, html, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { makeId } from '@dxos/react-hooks';

import { type Size } from '../defs';

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type AvatarVariant = 'square' | 'circle';
export type AvatarStatus = 'active' | 'inactive' | 'current' | 'error' | 'warning' | 'internal';
export type AvatarAnimation = 'pulse' | 'none';

const rx = '0.125rem';

export type DxAvatarProps = Partial<
  Pick<
    DxAvatar,
    | 'fallback'
    | 'imgSrc'
    | 'imgCrossOrigin'
    | 'imgReferrerPolicy'
    | 'variant'
    | 'status'
    | 'animation'
    | 'hue'
    | 'hueVariant'
    | 'size'
    | 'icon'
    | 'rootClassName'
  >
>;

// TODO(burdon): Needs popover.
@customElement('dx-avatar')
export class DxAvatar extends LitElement {
  private maskId: string;

  constructor() {
    super();
    this.maskId = makeId('avatar__mask');
  }

  @property({ type: String })
  fallback: string = '🫥';

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
  hueVariant: 'fill' | 'surface' = 'fill';

  @property({ type: String })
  size: Size = 10;

  @property({ type: String })
  icon: string | undefined = undefined;

  @property({ type: String })
  rootClassName: string | undefined = undefined;

  @state()
  loadingStaus: ImageLoadingStatus = 'idle';

  override connectedCallback(): void {
    super.connectedCallback();
    this.role = 'img';
    this.loadingStaus = this.imgSrc ? 'loading' : 'idle';
  }

  override willUpdate(changedProperties: Map<string, any>): void {
    if (changedProperties.has('imgSrc')) {
      this.loadingStaus = changedProperties.get('imgSrc') ? 'loading' : 'idle';
    }
  }

  private handleLoad(): void {
    this.loadingStaus = 'loaded';
  }

  private handleError(): void {
    this.loadingStaus = 'error';
  }

  override render() {
    const numericSize = this.size === 'px' ? 1 : Number(this.size);
    const sizePx = numericSize * 4;
    const ringWidth = this.status ? (numericSize > 4 ? 2 : numericSize > 3 ? 1 : 1) : 0;
    const ringGap = this.status ? (numericSize > 12 ? 3 : numericSize > 4 ? 2 : numericSize > 3 ? 1 : 0) : 0;
    const r = sizePx / 2 - ringGap - ringWidth;
    const isTextOnly = Boolean(this.fallback && /[0-9a-zA-Z]+/.test(this.fallback));
    const fontScale = (isTextOnly ? 3 : 3.6) * (1 / 1.612);
    const bg = this.hue
      ? this.hueVariant === 'surface'
        ? `var(--dx-${this.hue}Surface)`
        : `var(--dx-${this.hue === 'neutral' ? 'inputSurface' : `${this.hue}Fill`})`
      : 'var(--surface-bg)';
    const fg =
      this.hue && this.hueVariant === 'surface' ? `var(--dx-${this.hue}SurfaceText)` : 'var(--dx-accentSurfaceText)';

    return html`<span
      role="none"
      class=${`dx-avatar${this.rootClassName ? ` ${this.rootClassName}` : ''}`}
      data-size=${this.size}
      data-variant=${this.variant}
      data-status=${this.status}
      data-animation=${this.animation}
      data-state-loading-status=${this.loadingStaus}
      >${svg`<svg
        viewBox=${`0 0 ${sizePx} ${sizePx}`}
        width=${sizePx}
        height=${sizePx}
        class="dx-avatar__frame"
      >
        <defs>
          <mask id=${this.maskId}>
            ${
              this.variant === 'circle'
                ? svg`<circle fill="white" cx="50%" cy="50%" r=${r} />`
                : svg`
                  <rect
                    fill="white"
                    width=${2 * r}
                    height=${2 * r}
                    x=${ringGap + ringWidth}
                    y=${ringGap + ringWidth}
                    rx=${rx}
                  />`
            }
          </mask>
        </defs>
        ${
          this.variant === 'circle'
            ? svg`
              <circle
                cx="50%"
                cy="50%"
                r=${r}
                fill=${bg}
              />`
            : svg`
              <rect
                fill=${bg}
                x=${ringGap + ringWidth}
                y=${ringGap + ringWidth}
                width=${2 * r}
                height=${2 * r}
                rx=${rx}
              />`
        }
        ${
          this.icon
            ? svg`
              <use
                class="dx-avatar__icon"
                href=${this.icon}
                x=${sizePx / 5}
                y=${sizePx / 5}
                width=${(3 * sizePx) / 5}
                height=${(3 * sizePx) / 5} />`
            : // NOTE: Firefox currently doesn't fully support alignment-baseline.
              svg`
              <text
                x="50%"
                y="50%"
                class="dx-avatar__fallback-text"
                fill=${fg}
                text-anchor="middle"
                alignment-baseline="central"
                dominant-baseline="middle"
                font-size=${this.size === 'px' ? '200%' : this.size * fontScale}
                mask=${`url(#${this.maskId})`}
              >
                ${/\p{Emoji}/u.test(this.fallback) ? this.fallback : getInitials(this.fallback)}
              </text>`
        }
        ${
          this.imgSrc &&
          svg`
            <image
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
              class="dx-avatar__image"
              href=${this.imgSrc}
              mask=${`url(#${this.maskId})`}
              crossorigin=${this.imgCrossOrigin}
              @load=${this.handleLoad}
              @error=${this.handleError}
            />`
        }
      </svg>`}<span role="none" class="dx-avatar__ring" style=${styleMap({ borderWidth: ringWidth + 'px' })}
    /></span>`;
  }

  override createRenderRoot(): this {
    return this;
  }
}

/**
 * Returns the first two renderable characters from a string that are separated by non-word characters.
 * Handles Unicode characters correctly.
 */
const getInitials = (label = ''): string[] => {
  return label
    .trim()
    .split(/\s+/)
    .map((str) => str.replace(/[^\p{L}\p{N}\s]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase());
};
