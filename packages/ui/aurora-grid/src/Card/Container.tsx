//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { FC, PropsWithChildren } from 'react';

import { groupSurface, mx } from '@dxos/aurora-theme';

export const Column: FC<PropsWithChildren & { id: string }> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={mx(groupSurface, 'flex flex-col w-80 shrink-0 shadow rounded gap-2 z-10', isOver && 'ring')}
    >
      {children}
    </div>
  );
};
