//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { PropsWithChildren, ReactNode } from 'react';

import { ButtonProps } from '../../props';
import { buttonClassName } from '../../styles';
import { useId } from '../../util/useId';

export interface CompoundButtonProps extends ButtonProps {
  description?: ReactNode
  before?: ReactNode
  after?: ReactNode
}

export const CompoundButton = ({
  children,
  description,
  before,
  after,
  ...buttonProps
}: PropsWithChildren<CompoundButtonProps>) => {
  const variant = buttonProps.variant || 'default';
  const labelId = useId('compoundButton-label');
  return (
    <button
      {...buttonProps}
      className={cx(
        buttonClassName(buttonProps),
        'flex items-center gap-4',
        buttonProps.className
      )}
      aria-labelledby={labelId}
    >
      {before && (
        <div role='none' className='grow-0'>
          {before}
        </div>
      )}
      <div role='none' className='grow flex flex-col gap-1 text-left'>
        <p id={labelId}>{children}</p>
        {description && (
          <p
            className={cx(
              'text-xs font-normal',
              variant === 'default' && 'text-neutral-650 dark:text-neutral-300',
              variant === 'outline' && 'text-neutral-650 dark:text-neutral-300',
              variant === 'primary' && 'text-white/75'
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
