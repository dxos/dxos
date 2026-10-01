//
// Copyright 2022 DXOS.org
//

import React, { type ButtonHTMLAttributes, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { useId } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { mx } from '@dxos/ui-theme';

export type CompoundButtonSlots = {
  root: ComponentPropsWithoutRef<'button'>;
  middle: ComponentPropsWithoutRef<'div'>;
  label: ComponentPropsWithoutRef<'p'>;
  description: ComponentPropsWithoutRef<'p'>;
};

export type CompoundButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: Next.ButtonVariant;
  children?: ReactNode;
  description?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  slots?: Partial<CompoundButtonSlots>;
};

/** A Button whose label sits over a description, between optional leading and trailing content. */
export const CompoundButton = ({
  children,
  description,
  before,
  after,
  variant = 'default',
  slots = {},
  ...buttonProps
}: CompoundButtonProps) => {
  const labelId = useId('compoundButton-label');
  const descriptionId = useId('compoundButton-description');

  return (
    <Next.Button
      {...buttonProps}
      variant={variant}
      align='start'
      // The label and description wrap, so the button grows past one control's height.
      classNames={mx('h-auto gap-4 py-2.5 whitespace-normal', slots.root?.className)}
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
    </Next.Button>
  );
};
