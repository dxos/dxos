//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

import { Icon } from './util';

// TODO(burdon): Vertical scroll.

export type CardContentSlots = {
  root?: {
    className?: string;
  };
  body?: {
    className?: string;
  };
};

export type CardContentProps = {
  slots?: CardContentSlots;
  gutter?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
};

export const CardContent = ({ slots = {}, gutter, icon, children }: CardContentProps) => {
  return (
    <div className={mx('flex', gutter && 'ml-[40px]', slots.root?.className)}>
      {icon && <Icon>{icon}</Icon>}
      <div className={mx('flex w-full py-2 pr-2 font-sm', slots?.body?.className)}>{children}</div>
    </div>
  );
};
