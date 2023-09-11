//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { FC, PropsWithChildren } from 'react';

import { ClassNameValue, ScrollArea } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

export const ColumnRoot: FC<PropsWithChildren<{ classNames?: ClassNameValue }>> = ({ classNames, children }) => {
  return <div className={mx('flex flex-col shrink-0 overflow-hidden', classNames)}>{children}</div>;
};

export const ColumnHeader: FC<PropsWithChildren<{ classNames?: ClassNameValue }>> = ({ classNames, children }) => {
  return <div className={mx('shrink-0 px-4 py-2 truncate', classNames)}>{children}</div>;
};

export const ColumnFooter: FC<PropsWithChildren<{ classNames?: ClassNameValue }>> = ({ classNames, children }) => {
  return <div className={mx('shrink-0 px-4 py-2 truncate', classNames)}>{children}</div>;
};

export const ColumnViewPort: FC<PropsWithChildren & { id: string; classNames?: ClassNameValue }> = ({
  id,
  classNames,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={mx('flex flex-col grow px-3 py-2 overflow-y-auto', isOver && 'ring ring-blue-500', classNames)}
    >
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

export const Column = {
  Root: ColumnRoot,
  Header: ColumnHeader,
  Footer: ColumnFooter,
  ViewPort: ColumnViewPort,
};
