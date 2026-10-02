//
// Copyright 2022 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import type * as Button from '@dxos/react-ui/Button';
import * as ElevationProvider from '@dxos/react-ui/ElevationProvider';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Convert to radix primitive and move to react-ui.

export interface CompoundButtonSlots {
  root: ComponentPropsWithoutRef<'button'>;
  middle: ComponentPropsWithoutRef<'div'>;
  label: ComponentPropsWithoutRef<'p'>;
  description: ComponentPropsWithoutRef<'p'>;
}

export interface CompoundButtonProps extends Button.RootProps {
  children?: ReactNode;
  description?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  slots?: Partial<CompoundButtonSlots>;
}

export const CompoundButton = ({
  children,
  description,
  before,
  after,
  variant = 'default',
  elevation: propsElevation,
  slots = {},
  ...buttonProps
}: Omit<CompoundButtonProps, 'density'>) => {
  const labelId = Hooks.useId('compoundButton-label');
  const descriptionId = Hooks.useId('compoundButton-description');
  const { tx } = ThemeProvider.useThemeContext();
  const elevation = ElevationProvider.useElevationContext(propsElevation);
  const styleProps = { ...buttonProps, variant, elevation, textWrap: true };
  const buttonClassName = tx('button.root', styleProps, 'flex items-center gap-4 py-2.5', slots.root?.className);

  return (
    <button
      {...buttonProps}
      {...slots.root}
      className={buttonClassName}
      aria-labelledby={labelId}
      {...(description && { 'aria-describedby': descriptionId })}
    >
      {before && <div className='grow-0'>{before}</div>}
      <div
        {...slots.middle}
        className={mx('grow whitespace-normal flex flex-col gap-1 text-left', slots.middle?.className)}
      >
        <p {...slots.label} id={labelId} className={mx(slots.label?.className)}>
          {children}
        </p>
        {description && (
          <p
            id={descriptionId}
            {...slots.description}
            className={mx(
              'text-xs mb-1 font-normal',
              variant === 'primary' ? 'text-sm font-normal text-base-fg' : 'text-description',
              slots.description?.className,
            )}
          >
            {description}
          </p>
        )}
      </div>
      {after && <div className='grow-0'>{after}</div>}
    </button>
  );
};
