//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { FC, PropsWithChildren } from 'react';

import { ClassNameValue, ScrollArea } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

export const Column: FC<PropsWithChildren & { id: string; classNames?: ClassNameValue }> = ({
  id,
  classNames,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={mx('flex flex-col shrink-0 overflow-y-auto', classNames)}>
      <div className={mx('flex flex-col gap-2')}>{children}</div>
    </div>
  );

  // TODO(burdon): Breaks min-width.
  return (
    <ScrollArea.Root classNames={['shrink-0', classNames, isOver && 'ring']}>
      <ScrollArea.Viewport ref={setNodeRef}>
        <div className={mx('flex flex-col gap-2')}>{children}</div>
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
  const { setNodeRef } = useDroppable({ id, disabled: true });
  return (
    <div ref={setNodeRef} className={mx('flex px-2 gap-6 overflow-y-hidden overflow-x-auto', classNames)}>
      {children}
    </div>
  );

  // TODO(burdon): Breaks inner column scrolling.
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
