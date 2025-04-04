//
// Copyright 2025 DXOS.org
//

import { html, LitElement } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { makeId } from '@dxos/react-hooks';
import { type Size } from '@dxos/react-ui-types';

type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

type AvatarVariant = 'square' | 'circle';
type AvatarStatus = 'active' | 'inactive' | 'current' | 'error' | 'warning' | 'internal';
type AvatarAnimation = 'pulse' | 'none';

const rx = '0.25rem';

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
  animation: AvatarAnimation = 'none';

  @property({ type: Boolean })
  inGroup: boolean = false;

  @property({ type: String })
  hue: string | undefined = undefined;

  @property({ type: String })
  size: Size = 10;

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
    const r = sizePx / 2 - ringGap - ringWidth;
    const isTextOnly = Boolean(this.label && /[0-9a-zA-Z]+/.test(this.label));
    const fontScale = (isTextOnly ? 3 : 4) * (1 / 1.612);
    return html`<span class="dx-avatar"
      ><svg
        viewBox=${`0 0 ${sizePx} ${sizePx}`}
        width=${sizePx}
        height=${sizePx}
        class=${tx('avatar.frame', 'avatar__frame', { variant })}
      >
        <defs>
          <mask id=${this.maskId}>
            {variant === 'circle' ? (
            <circle fill="white" cx="50%" cy="50%" r=${r} />
            ) : (
            <rect
              fill="white"
              width=${2 * r}
              height=${2 * r}
              x=${ringGap + ringWidth}
              y=${ringGap + ringWidth}
              rx=${rx}
            />
            )}
          </mask>
        </defs>
        ${
          this.variant === 'circle'
            ? html`<circle
                cx="50%"
                cy="50%"
                r=${r}
                fill=${this.hue ? `var(--dx-${this.hue}Fill)` : 'var(--surface-bg)'}
              />`
            : html`<rect
                fill=${this.hue ? `var(--dx-${this.hue}Fill)` : 'var(--surface-bg)'}
                x=${ringGap + ringWidth}
                y=${ringGap + ringWidth}
                width=${2 * r}
                height=${2 * r}
                rx=${rx}
              />`
        }
        ${
          this.imgSrc &&
          html`<image
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
            href=${this.imgSrc}
            ?crossorigin=${this.imgCrossOrigin}
            ?referrerpolicy=${this.imgReferrerPolicy}
            @load=${this.handleLoad}
            @error=${this.handleError}
          />`
        }
      <text
        x='50%'
        y='50%'
        class=${tx('avatar.fallbackText', 'avatar__fallback-text')}
      textAnchor='middle'
      alignmentBaseline='central'
      fontSize=${this.size === 'px' ? '200%' : this.size * fontScale}
      mask=${`url(#${this.maskId})`}
    >
      </svg>
      <span
        role="none"
        class=${tx('avatar.ring', 'avatar__ring', { size, variant, status, animation })}
        style=${styleMap({ borderWidth: ringWidth + 'px' })}
    /></span>`;
  }

  override createRenderRoot() {
    return this;
  }
}
