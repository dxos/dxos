//
// Copyright 2022 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef, memo } from 'react';

import { type Density, type Elevation } from '@dxos/ui-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';
import { BUTTON_GROUP_NAME, BUTTON_NAME, ButtonGroupProvider, useButtonGroupContext } from './ButtonGroupContext';

type ButtonProps = ThemedClassName<ComponentPropsWithRef<typeof ark.button>> & {
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'destructive' | 'valence';
  density?: Density;
  elevation?: Elevation;
  asChild?: boolean;
  /** Render a trailing caret indicating the button opens a menu. */
  caretDown?: boolean;
};

const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        classNames,
        children,
        density: densityProp,
        elevation: elevationProp,
        variant = 'default',
        asChild,
        caretDown,
        ...props
      },
      ref,
    ) => {
      const { inGroup } = useButtonGroupContext(BUTTON_NAME);
      const { tx } = useThemeContext();
      const elevation = useElevationContext(elevationProp);
      const density = useDensityContext(densityProp);
      return (
        <ark.button
          asChild={asChild}
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
          {/* `asChild` clones its single child; only add the caret in the non-`asChild` case so the
              child stays exactly one element. */}
          {caretDown && !asChild ? (
            <>
              {children}
              <Icon size={3} icon='ph--caret-down--bold' />
            </>
          ) : (
            children
          )}
        </ark.button>
      );
    },
  ),
);

Button.displayName = BUTTON_NAME;

type ButtonGroupProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & {
  elevation?: Elevation;
  asChild?: boolean;
};

const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, elevation: propsElevation, classNames, asChild, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const elevation = useElevationContext(propsElevation);
    return (
      <ark.div
        asChild={asChild}
        {...props}
        className={tx('button.group', { elevation }, classNames)}
        ref={forwardedRef}
      >
        <ButtonGroupProvider inGroup>{children}</ButtonGroupProvider>
      </ark.div>
    );
  },
);

ButtonGroup.displayName = BUTTON_GROUP_NAME;

export { Button, ButtonGroup };

export type { ButtonGroupProps, ButtonProps };
