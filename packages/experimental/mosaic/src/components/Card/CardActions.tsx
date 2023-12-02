//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { Icon } from './util';

export type CardActionsSlots = {
  root?: {
    className?: string;
  };
};

export type CardActionsProps = {
  slots?: CardActionsSlots;
  children?: ReactNode;
  gutter?: boolean;
};

export const CardActions = ({ slots = {}, gutter, children }: CardActionsProps) => {
  return (
    <div className={mx('flex h-[40px] px-2', slots.root?.className)}>
      {gutter && <Icon />}
      <div className={mx('flex h-[40px] space-x-4', slots.root?.className)}>{children}</div>
    </div>
  );
};
