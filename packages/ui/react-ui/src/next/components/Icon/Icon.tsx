//
// Copyright 2026 DXOS.org
//

import React, { type SVGProps, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ChromaticPalette, type MessageValence, type NeutralPalette, type ThemedClassName } from '@dxos/ui-types';

import { useIconHref } from '../../../hooks/index.ts';
import { recipes } from '../../recipes.ts';

export type IconHue = NeutralPalette | ChromaticPalette | MessageValence;

export type IconProps = ThemedClassName<Omit<SVGProps<SVGSVGElement>, 'ref'>> & {
  icon: string;
  /** Names the icon for assistive tech; without it the icon is decorative and hidden. */
  label?: string;
  /** Colours the glyph with a Tag hue's foreground (`--color-<hue>-fg`). */
  hue?: IconHue;
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ icon, label, hue, classNames, ...props }, forwardedRef) => {
  const href = useIconHref(icon);
  return (
    <svg
      {...props}
      {...(label ? { 'role': 'img', 'aria-label': label } : { 'aria-hidden': true })}
      data-scope='icon'
      data-part='root'
      data-hue={hue}
      className={mx(recipes.icon(), classNames)}
      ref={forwardedRef}
    >
      <use href={href} />
    </svg>
  );
});

Icon.displayName = 'Next.Icon';
