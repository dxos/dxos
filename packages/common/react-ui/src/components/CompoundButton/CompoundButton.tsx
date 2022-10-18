//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ReactNode } from 'react';

import { buttonClassName, ButtonProps } from '../Button/Button';

export interface CompoundButtonProps
  extends Omit<ButtonProps, 'children'> {
  label: ReactNode
  description?: ReactNode
  before?: ReactNode
  after?: ReactNode
}

export const CompoundButton = ({
  label,
  description,
  before,
  after,
  ...buttonProps
}: CompoundButtonProps) => {
  return (
    <button
      {...buttonProps}
      className={cx(
        buttonClassName(buttonProps),
        'flex items-center gap-4',
        buttonProps.className
      )}
    >
      {before && (
        <div role='none' className='grow-0'>
          {before}
        </div>
      )}
      <div role='none' className='grow flex flex-col gap-1 text-left'>
        <p>{label}</p>
        {description && <p className='text-xs'>{description}</p>}
      </div>
      {after && (
        <div role='none' className='grow-0'>
          {after}
        </div>
      )}
    </button>
  );
};
