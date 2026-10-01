//
// Copyright 2026 DXOS.org
//

import React, { type SVGProps, forwardRef, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ChromaticPalette, type MessageValence, type NeutralPalette, type ThemedClassName } from '@dxos/ui-types';

import { useIconHref } from '../../../hooks/useIconHref.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';

export type IconHue = NeutralPalette | ChromaticPalette | MessageValence;

export type IconValence = MessageValence;

/** Text emphasis below the default, as Typography's `tone`. */
export type IconTone = 'description' | 'subdued';

export type IconProps = ThemedClassName<Omit<SVGProps<SVGSVGElement>, 'ref'>> & {
  icon: string;
  /** Names the icon for assistive tech; without it the icon is decorative and hidden. */
  label?: string;
  /** Colours the glyph with a Tag hue's foreground (`--color-<hue>-fg`). */
  hue?: IconHue;
  /** Colours the glyph with a valence's semantic text colour (`--color-<valence>-text`); takes precedence over `hue`. */
  valence?: IconValence;
  /** A lower-emphasis colour (`--color-description` or `--color-subdued`); `hue` and `valence` take precedence. */
  tone?: IconTone;
  /**
   * Rotates continuously, as a busy indicator; still under `prefers-reduced-motion`. Spinners share one phase (the
   * animation starts at the wall clock's second), so several in a list turn together.
   */
  spin?: boolean;
  /** The icon at this size's scale instead of its scope's (one icon in a denser or roomier control). */
  size?: Size;
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon, label, hue, valence, tone, spin, size, classNames, style, ...props }, forwardedRef) => {
    const href = useIconHref(icon);
    // A negative delay of the wall clock's offset into the 1s turn puts every spinner at the same angle.
    const spinDelay = useMemo(() => (spin ? `${-(Date.now() % 1_000)}ms` : undefined), [spin]);
    return (
      <svg
        {...props}
        style={spinDelay ? { ...style, animationDelay: spinDelay } : style}
        {...(label ? { 'role': 'img', 'aria-label': label } : { 'aria-hidden': true })}
        data-scope='icon'
        data-part='root'
        data-hue={hue}
        data-valence={valence}
        data-tone={tone}
        data-spin={spin ? '' : undefined}
        data-icon-size={size}
        className={mx(recipes.icon(), classNames)}
        ref={forwardedRef}
      >
        <use href={href} />
      </svg>
    );
  },
);

Icon.displayName = 'Next.Icon';
