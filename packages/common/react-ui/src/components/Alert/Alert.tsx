//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ComponentProps, ReactNode } from 'react';

import { useId } from '../../hooks';
import { MessageValence } from '../../props';
import { valenceAlertColors } from '../../styles';

export interface AlertProps extends Omit<ComponentProps<'div'>, 'title'> {
  title: ReactNode;
  assertive?: boolean;
  valence?: MessageValence;
  children?: ReactNode;
}

export const Alert = ({
  title,
  children,
  assertive,
  valence,
  ...divProps
}: AlertProps) => {
  const labelId = useId('alertLabel');
  return (
    <div
      role={assertive ? 'alert' : 'group'}
      {...divProps}
      className={cx(
        'p-3 border rounded-md',
        valenceAlertColors(valence),
        divProps.className
      )}
      aria-labelledby={labelId}
    >
      <p id={labelId} className='font-medium mb-2'>
        {title}
      </p>
      {children}
    </div>
  );
};
