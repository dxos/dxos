//
// Copyright 2024 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef, memo, useMemo } from 'react';

import { type Size } from '@dxos/ui-types';

import { useIconHref, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type IconProps = ThemedClassName<ComponentPropsWithRef<typeof ark.svg>> & {
  icon: string;
  size?: Size;
  synchronized?: boolean;
};

/**
 * The Icon's size can be set directly or inherited from the `--dx-icon-size` CSS variable.
 */
export const Icon = memo(
  forwardRef<SVGSVGElement, IconProps>(({ classNames, icon, size, synchronized, style, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const spinDelay = useMemo(() => (synchronized ? `${-(Date.now() % 1_000)}ms` : undefined), [synchronized]);
    const href = useIconHref(icon);

    return (
      <svg
        {...props}
        style={{ ...style, animationDelay: spinDelay }}
        className={tx('icon.root', { size }, classNames)}
        ref={forwardedRef}
      >
        <use href={href} />
      </svg>
    );
  }),
);
