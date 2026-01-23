//
// Copyright 2022 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { type ButtonProps, useElevationContext, useId, useThemeContext } from '@dxos/react-ui';
import { descriptionText, descriptionTextPrimary, mx } from '@dxos/ui-theme';

export interface CompoundButtonSlots {
  root: ComponentPropsWithoutRef<'button'>;
  middle: ComponentPropsWithoutRef<'div'>;
  label: ComponentPropsWithoutRef<'p'>;
  description: ComponentPropsWithoutRef<'p'>;
}

export interface CompoundButtonProps extends ButtonProps {
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
  const labelId = useId('compoundButton-label');
  const descriptionId = useId('compoundButton-description');
  const { tx } = useThemeContext();
  const elevation = useElevationContext(propsElevation);
  const styleProps = { ...buttonProps, variant, elevation, textWrap: true };
  const buttonClassName = tx(
    'button.root',
    'button button--compound',
    styleProps,
    'flex items-center gap-4 plb-2.5',
    slots.root?.className,
  );
  return (
    <button
      {...buttonProps}
      {...slots.root}
      className={buttonClassName}
      aria-labelledby={labelId}
      {...(description && { 'aria-describedby': descriptionId })}
    >
      {before && (
        <div role='none' className='grow-0'>
          {before}
        </div>
      )}
      <div
        role='none'
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
              'text-xs mbe-1 font-normal',
              variant === 'primary' ? descriptionTextPrimary : descriptionText,
              slots.description?.className,
            )}
          >
            {description}
          </p>
        )}
      </div>
      {after && (
        <div role='none' className='grow-0'>
          {after}
        </div>
      )}
    </button>
  );
};
