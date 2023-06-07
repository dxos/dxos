//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren } from 'react';

import { ListItem, ListItemRootProps } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

// TODO(burdon): Move to react-appkit?
// Removes need for class overrides in console.

export type ListItemButtonProps = ListItemRootProps & {
  slots?: any;
  onClick?: () => void;
};

export const ListItemButton = ({ slots, onClick, selected, ...rest }: ListItemButtonProps) => {
  return (
    <ListItem.Root
      classNames={[
        'flex items-center overflow-hidden cursor-pointer px-2 py-1',
        selected && 'bg-highlight-bg dark:bg-dark-highlight-bg',
      ]}
      onClick={onClick}
      {...rest}
    />
  );
};

export const ListItemText: FC<PropsWithChildren<{ className: string }>> = ({ className, children }) => (
  <div className={mx('w-full px-2 truncate', className)}>{children}</div>
);
