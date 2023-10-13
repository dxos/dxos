//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

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

/**
 * No padding since Headers, Action and Content sections should span entire width.
 */
export const Card = ({ slots = {}, children }: CardProps) => {
  return (
    <div
      className={mx(
        'flex flex-col w-full max-w-[400px] overflow-hidden',
        styles.bg,
        styles.frame,
        styles.body,
        styles.divide,
        slots.root?.className,
      )}
    >
      {children}
    </div>
  );
};
