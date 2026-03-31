//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef, memo } from 'react';

import { type Density, type Elevation } from '@dxos/ui-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type ButtonProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.button>> & {
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'destructive';
  density?: Density;
  elevation?: Elevation;
  asChild?: boolean;
};

type ButtonGroupContextValue = { inGroup?: boolean };

const BUTTON_GROUP_NAME = 'ButtonGroup';
const BUTTON_NAME = 'Button';

const [ButtonGroupProvider, useButtonGroupContext] = createContext<ButtonGroupContextValue>(BUTTON_GROUP_NAME, {
  inGroup: false,
});

const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      { classNames, children, density: densityProp, elevation: elevationProp, variant = 'default', asChild, ...props },
      ref,
    ) => {
      const { inGroup } = useButtonGroupContext(BUTTON_NAME);
      const { tx } = useThemeContext();
      const elevation = useElevationContext(elevationProp);
      const density = useDensityContext(densityProp);
      const Comp = asChild ? Slot : Primitive.button;
      return (
        <Comp
          ref={ref}
          {...props}
          data-variant={variant}
          data-density={density}
          data-props={inGroup ? 'grouped' : ''}
          className={tx(
            'button.root',
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
        </Comp>
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
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp role='none' {...props} className={tx('button.group', { elevation }, classNames)} ref={forwardedRef}>
        <ButtonGroupProvider inGroup>{children}</ButtonGroupProvider>
      </Comp>
    );
  },
);

ButtonGroup.displayName = BUTTON_GROUP_NAME;

export { Button, ButtonGroup, BUTTON_GROUP_NAME, useButtonGroupContext };

export type { ButtonProps, ButtonGroupProps };
