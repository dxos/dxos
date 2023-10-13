//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

// TODO(burdon): Use r-c.

export type ListProps = { children?: ReactNode };

export const List = ({ children }: ListProps) => {
  return <div className='flex flex-col overflow-hidden'>{children}</div>;
};

export type ListItemProps = { children?: ReactNode; gutter?: ReactNode; action?: ReactNode };

export const ListItem = ({ children, gutter, action }: ListItemProps) => {
  return (
    <div className='flex h-[40px] overflow-hidden items-center'>
      {gutter}
      <div className='flex w-full overflow-hidden'>{children}</div>
      {action}
    </div>
  );
};

export type IconButtonProps = { children?: ReactNode };

export const IconButton = ({ children }: IconButtonProps) => <div className='flex shrink-0 px-2'>{children}</div>;

export type ListItemTextProps = { children?: ReactNode };

export const ListItemText = ({ children }: ListItemTextProps) => {
  return <div className='truncate'>{children}</div>;
};
