//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

import { Icon, styles } from './util';

export type CardHeaderSlots = {
  root?: {
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
      className={mx('flex w-full h-[40px] overflow-hidden items-center text-lg', styles.heading, slots.root?.className)}
    >
      {icon && <Icon>{icon}</Icon>}
      <div className={mx('w-full truncate', gutter && !icon && 'ml-[40px]')}>{children}</div>
      {action && <Icon>{action}</Icon>}
    </div>
  );
};
