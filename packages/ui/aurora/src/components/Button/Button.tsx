//
// Copyright 2022 DXOS.org
//

import React, { forwardRef } from 'react';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { ButtonProps } from './ButtonProps';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, density: propsDensity, elevation: propsElevation, variant = 'default', ...rootSlot }, ref) => {
    const { tx } = useThemeContext();
    const { elevation } = useElevationContext();
    const density = useDensityContext();
    return (
      <button
        ref={ref}
        {...rootSlot}
        className={tx(
          'button.root',
          'aurora__button',
          {
            variant,
            disabled: rootSlot.disabled,
            density: propsDensity ?? density,
            elevation: propsElevation ?? elevation
          },
          rootSlot.className
        )}
        {...(rootSlot.disabled && { disabled: true })}
      >
        {children}
      </button>
    );
  }
);
