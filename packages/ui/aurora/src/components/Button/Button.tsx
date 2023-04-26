//
// Copyright 2022 DXOS.org
//

import { createContextScope, Scope } from '@radix-ui/react-context';
import React, { ComponentProps, ComponentPropsWithRef, forwardRef, ReactNode } from 'react';

import { Density, Elevation } from '@dxos/aurora-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost';
  density?: Density;
  elevation?: Elevation;
  disabled?: boolean;
}

type ButtonGroupScopedProps<P> = P & { __buttonGroupScope?: Scope };
type ButtonGroupContextValue = { inGroup?: boolean };
const BUTTON_GROUP_NAME = 'ButtonGroup';
const [createButtonGroupContext, createButtonGroupScope] = createContextScope(BUTTON_GROUP_NAME, []);
const [ButtonGroupProvider, useButtonGroupContext] =
  createButtonGroupContext<ButtonGroupContextValue>(BUTTON_GROUP_NAME);

const Button = forwardRef<HTMLButtonElement, ButtonGroupScopedProps<ButtonProps>>(
  (
    {
      children,
      density: propsDensity,
      elevation: propsElevation,
      variant = 'default',
      __buttonGroupScope,
      ...rootSlot
    },
    ref
  ) => {
    const { inGroup } = useButtonGroupContext(BUTTON_GROUP_NAME, __buttonGroupScope);
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

const ButtonGroup = ({ children, __buttonGroupScope, ...divProps }: ButtonGroupScopedProps<ButtonGroupProps>) => {
  const { tx } = useThemeContext();
  const { elevation } = useElevationContext();
  return (
    <div role='none' {...divProps} className={tx('button.group', 'button-group', { elevation }, divProps.className)}>
      <ButtonGroupProvider scope={__buttonGroupScope} inGroup>
        {children}
      </ButtonGroupProvider>
    </div>
  );
};

export { Button, ButtonGroup, BUTTON_GROUP_NAME, createButtonGroupScope, useButtonGroupContext };

export type { ButtonProps, ButtonGroupProps };
