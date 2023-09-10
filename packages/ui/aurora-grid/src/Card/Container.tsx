//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { FC, PropsWithChildren } from 'react';

import { ScrollArea } from '@dxos/aurora';
import { groupSurface } from '@dxos/aurora-theme';

// TODO(burdon): Scroll-x
export const Column: FC<PropsWithChildren & { id: string }> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport
        ref={setNodeRef}
        classNames={[groupSurface, 'flex shrink-0 w-80', 'shadow rounded', isOver && 'ring']}
      >
        <div className='flex flex-col gap-2 p-2'>{children}</div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
