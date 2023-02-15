//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, ReactNode } from 'react';

import { useId } from '../../hooks';
import { MessageValence } from '../../props';
import { alertValence } from '../../styles';
import { mx } from '../../util';
import { useButtonShadow } from '../../hooks/useElevationContext';

export interface AlertSlots {
  root?: Omit<ComponentProps<'div'>, 'children'>;
  title?: Omit<ComponentProps<'p'>, 'children'>;
}

export interface AlertProps {
  title: ReactNode;
  assertive?: boolean;
  valence?: MessageValence;
  children?: ReactNode;
  slots?: AlertSlots;
}

export const Alert = ({ title, children, assertive, valence, slots = {} }: AlertProps) => {
  const labelId = useId('alertLabel');
  const shadow = useButtonShadow();
  return (
    <div
      {...slots.root}
      role={assertive ? 'alert' : 'group'}
      aria-labelledby={labelId}
      className={mx('p-3 rounded-md', shadow, alertValence(valence), slots.root?.className)}
    >
      <p {...slots.title} id={labelId} className={mx('font-medium mb-2', slots.title?.className)}>
        {title}
      </p>
      {children}
    </div>
  );
};
