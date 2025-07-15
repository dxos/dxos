//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef, memo } from 'react';

import { type Density, type Elevation } from '@dxos/react-ui-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

interface ButtonProps extends ThemedClassName<ComponentPropsWithRef<typeof Primitive.button>> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'destructive';
  density?: Density;
  elevation?: Elevation;
  asChild?: boolean;
}

type ButtonGroupContextValue = { inGroup?: boolean };

const BUTTON_GROUP_NAME = 'ButtonGroup';
const BUTTON_NAME = 'Button';

const [ButtonGroupProvider, useButtonGroupContext] = createContext<ButtonGroupContextValue>(BUTTON_GROUP_NAME, {
  inGroup: false,
});

const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        classNames,
        children,
        density: propsDensity,
        elevation: propsElevation,
        variant = 'default',
        asChild,
        ...props
      },
      ref,
    ) => {
      const { inGroup } = useButtonGroupContext(BUTTON_NAME);
      const { tx } = useThemeContext();
      const elevation = useElevationContext(propsElevation);
      const density = useDensityContext(propsDensity);
      const Root = asChild ? Slot : Primitive.button;
      return (
        <Root
          ref={ref}
          {...props}
          data-variant={variant}
          data-density={density}
          data-props={inGroup ? 'grouped' : ''}
          className={tx(
            'button.root',
            'button',
            {
              variant,
              inGroup,
              disabled: props.disabled,
              density,
              elevation,
            },
            classNames,
          )}
          {...(props.disabled && { disabled: true })}
        >
          {children}
        </Root>
      );
    },
  ),
);

Button.displayName = BUTTON_NAME;

type ButtonGroupProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  elevation?: Elevation;
  asChild?: boolean;
};

const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, elevation: propsElevation, classNames, asChild, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const elevation = useElevationContext(propsElevation);
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        role='none'
        {...props}
        className={tx('button.group', 'button-group', { elevation }, classNames)}
        ref={forwardedRef}
      >
        <ButtonGroupProvider inGroup>{children}</ButtonGroupProvider>
      </Root>
    );
  },
);

ButtonGroup.displayName = BUTTON_GROUP_NAME;

export { Button, ButtonGroup, BUTTON_GROUP_NAME, useButtonGroupContext };

export type { ButtonProps, ButtonGroupProps };
