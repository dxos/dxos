//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { StackItem } from '@dxos/react-ui-stack';

export const Container = ({ toolbar, children }: PropsWithChildren<{ toolbar: ReactNode }>) => {
  return (
    <StackItem.Content toolbar={!!toolbar} classNames='divide-y divide-separator'>
      {toolbar}
      <div className='flex flex-col grow overflow-auto'>{children}</div>
    </StackItem.Content>
  );
};
