//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Icon, styles } from './util';

export type CardHeaderSlots = {
  root?: {
    className?: string;
  };
  header?: {
    className?: string;
  };
};

export type CardHeaderProps = {
  slots?: CardHeaderSlots;
  gutter?: boolean;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
};

export const CardHeader = ({ slots = {}, gutter, icon, action, children }: CardHeaderProps) => {
  return (
    <div
      className={mx(
        'flex w-full h-[40px] overflow-hidden items-center text-lg px-2',
        styles.heading,
        slots.root?.className,
      )}
    >
      {(gutter || icon) && <Icon>{icon}</Icon>}
      <div className={mx('px-2 w-full truncate', slots.header?.className)}>{children}</div>
      {action && <Icon>{action}</Icon>}
    </div>
  );
};
