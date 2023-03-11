//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

// TODO(burdon): Remove.
import { styles } from './util';

// TODO(burdon): Density.
// https://mui.com/material-ui/react-card

export type CardSlots = {
  root?: {
    className?: string;
  };
};

export type CardProps = {
  slots?: CardSlots;
  children?: ReactNode;
};

export const Card = ({ slots = {}, children }: CardProps) => {
  return (
    <div
      className={mx(
        'flex flex-col w-full max-w-[400px] overflow-hidden divide-y rounded border',
        styles.bg,
        styles.border,
        styles.body,
        styles.divide,
        slots.root?.className
      )}
    >
      {children}
    </div>
  );
};
