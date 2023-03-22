//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren } from 'react';

import { ListItem, ListItemProps, mx } from '@dxos/react-components';

// TODO(burdon): Move to react-components?
// Removes need for class overrides in console.

export type ListItemButtonProps = ListItemProps & {
  slots?: any;
  onClick?: () => void;
};

export const ListItemButton = ({ slots, onClick, selected, ...rest }: ListItemButtonProps) => {
  return (
    <ListItem
      slots={{
        // TODO(burdon): How to deal with colors?
        root: { className: mx('px-2 py-1', selected && 'bg-zinc-600') },
        mainContent: { className: 'flex items-center overflow-hidden cursor-pointer', onClick },
        ...slots
      }}
      {...rest}
    />
  );
};

export const ListItemText: FC<PropsWithChildren> = ({ children }) => (
  <div className='w-full px-1 truncate'>{children}</div>
);
