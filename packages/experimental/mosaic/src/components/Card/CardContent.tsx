//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type CardContentSlots = {
  root?: {
    className?: string;
  };
};

export type CardContentProps = {
  slots?: CardContentSlots;
  children?: ReactNode;
  gutter?: boolean;
};

export const CardContent = ({ slots = {}, gutter, children }: CardContentProps) => {
  return <div className={mx('flex flex-col', gutter && 'ml-[40px]', slots.root?.className)}>{children}</div>;
};
