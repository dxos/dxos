//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { PropsWithChildren, ReactNode } from 'react';

import { useId } from '../../hooks';
import { ButtonProps } from '../../props';
import { buttonClassName, defaultDescription, primaryDescription } from '../../styles';

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
  const descriptionId = useId('compoundButton-description');
  return (
    <button
      {...buttonProps}
      className={cx(
        buttonClassName(buttonProps),
        'flex items-center gap-4 py-2.5',
        buttonProps.className
      )}
      aria-labelledby={labelId}
      {...(description && { 'aria-describedby': descriptionId })}
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
            id={descriptionId}
            className={cx(
              'text-xs font-normal mb-1',
              variant === 'primary' ? primaryDescription : defaultDescription
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
