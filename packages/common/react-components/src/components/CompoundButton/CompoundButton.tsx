//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { useId, useThemeContext } from '../../hooks';
import { defaultDescription, primaryDescription } from '../../styles';
import { mx } from '../../util';
import { ButtonProps, buttonStyles } from '../Button';

export interface CompoundButtonProps extends ButtonProps {
  children?: ReactNode;
  description?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
}

export const CompoundButton = ({ children, description, before, after, ...buttonProps }: CompoundButtonProps) => {
  const variant = buttonProps.variant || 'default';
  const labelId = useId('compoundButton-label');
  const descriptionId = useId('compoundButton-description');
  const { themeVariant } = useThemeContext();
  return (
    <button
      {...buttonProps}
      className={mx(buttonStyles(buttonProps, themeVariant), 'flex items-center gap-4 plb-2.5', buttonProps.className)}
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
            className={mx(
              'text-xs mbe-1',
              variant === 'primary' ? primaryDescription : defaultDescription,
              themeVariant === 'os' ? 'font-system-normal' : 'font-normal'
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
