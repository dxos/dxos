//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { FC, PropsWithChildren } from 'react';

import { ClassNameValue, ScrollArea } from '@dxos/aurora';

export const Column: FC<PropsWithChildren & { id: string; classNames?: ClassNameValue }> = ({
  id,
  classNames,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <ScrollArea.Root classNames={['shrink-0', classNames, isOver && 'ring']}>
      <ScrollArea.Viewport ref={setNodeRef}>
        <div className='flex flex-col gap-2 p-2'>{children}</div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};

export const Columns: FC<PropsWithChildren & { id: string; classNames?: ClassNameValue }> = ({
  id,
  classNames,
  children,
}) => {
  // const { setNodeRef } = useDroppable({ id, disabled: true });
  return (
    <ScrollArea.Root classNames={classNames}>
      <ScrollArea.Viewport>
        <div className='flex px-2 gap-8'>{children}</div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='horizontal'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
