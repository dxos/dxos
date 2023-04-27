//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { ComponentProps, ComponentPropsWithRef, forwardRef, ReactNode } from 'react';

import { Density, Elevation } from '@dxos/aurora-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost';
  density?: Density;
  elevation?: Elevation;
  disabled?: boolean;
}

type ButtonGroupContextValue = { inGroup?: boolean };
const BUTTON_GROUP_NAME = 'ButtonGroup';
const BUTTON_NAME = 'Button';
const [ButtonGroupProvider, useButtonGroupContext] = createContext<ButtonGroupContextValue>(BUTTON_GROUP_NAME, {
  inGroup: false
});

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, density: propsDensity, elevation: propsElevation, variant = 'default', ...rootSlot }, ref) => {
    const { inGroup } = useButtonGroupContext(BUTTON_NAME);
    const { tx } = useThemeContext();
    const { elevation } = useElevationContext();
    const density = useDensityContext();
    return (
      <button
        ref={ref}
        {...rootSlot}
        className={tx(
          'button.root',
          'button',
          {
            variant,
            inGroup,
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

interface ButtonGroupProps extends ComponentProps<'div'> {
  children?: ReactNode;
}

const ButtonGroup = ({ children, ...divProps }: ButtonGroupProps) => {
  const { tx } = useThemeContext();
  const { elevation } = useElevationContext();
  return (
    <div role='none' {...divProps} className={tx('button.group', 'button-group', { elevation }, divProps.className)}>
      <ButtonGroupProvider inGroup>{children}</ButtonGroupProvider>
    </div>
  );
};

export { Button, ButtonGroup, BUTTON_GROUP_NAME, useButtonGroupContext };

export type { ButtonProps, ButtonGroupProps };
