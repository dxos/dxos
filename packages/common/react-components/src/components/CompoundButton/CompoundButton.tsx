//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithoutRef, ReactNode } from 'react';

import { useId, useThemeContext } from '../../hooks';
import { defaultDescription, primaryDescription } from '../../styles';
import { mx } from '../../util';
import { ButtonProps, buttonStyles } from '../Button';

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
  compact,
  variant = 'default',
  slots = {},
  ...buttonProps
}: CompoundButtonProps) => {
  const labelId = useId('compoundButton-label');
  const descriptionId = useId('compoundButton-description');
  const { themeVariant } = useThemeContext();
  return (
    <button
      {...buttonProps}
      {...slots.root}
      className={mx(buttonStyles(buttonProps, themeVariant), 'flex items-center gap-4 plb-2.5', slots.root?.className)}
      aria-labelledby={labelId}
      {...(description && { 'aria-describedby': descriptionId })}
    >
      {before && (
        <div role='none' className='grow-0'>
          {before}
        </div>
      )}
      <div role='none' {...slots.middle} className={mx('grow flex flex-col gap-1 text-left', slots.middle?.className)}>
        <p {...slots.label} id={labelId} className={mx(slots.label?.className)}>
          {children}
        </p>
        {description && (
          <p
            id={descriptionId}
            {...slots.description}
            className={mx(
              'text-xs mbe-1',
              variant === 'primary' ? primaryDescription : defaultDescription,
              themeVariant === 'os' ? 'font-system-normal' : 'font-normal',
              slots.description?.className
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
