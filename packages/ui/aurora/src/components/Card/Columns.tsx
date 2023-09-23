//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { FC, PropsWithChildren } from 'react';

import { mx } from '@dxos/aurora-theme';
import { ClassNameValue } from '@dxos/aurora-types';

import { ScrollArea } from '../ScrollArea';

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
