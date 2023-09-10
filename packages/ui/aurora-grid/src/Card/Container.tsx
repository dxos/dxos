//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { FC, PropsWithChildren } from 'react';

import { groupSurface, mx } from '@dxos/aurora-theme';

export const Container: FC<PropsWithChildren & { id: string }> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={mx('flex flex-col shrink-0 overflow-hidden rounded gap-2', groupSurface)}>
      {children}
    </div>
  );
};
