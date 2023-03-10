//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

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
  return <div className={mx('flex h-[40px] space-x-4', gutter && 'pl-[40px]', slots.root?.className)}>{children}</div>;
};
