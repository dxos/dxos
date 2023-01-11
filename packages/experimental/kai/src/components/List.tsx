//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type ListSlots = {
  root?: string;
};

export type ListProps = { classes?: ListSlots; children?: ReactNode };

export const List: FC<ListProps> = ({ classes, children }) => {
  return <ul className={mx('flex flex-col', classes?.root)}>{children}</ul>;
};

export type ListItemSlots = {
  root?: string;
  hover?: string;
  selected?: string;
};

export type ListItemProps = { selected?: boolean; classes?: ListItemSlots; children?: ReactNode; onClick?: () => void };

export const ListItemButton: FC<ListItemProps> = ({ selected, classes, children, onClick }) => {
  return (
    <li
      className={mx(
        'flex items-center',
        classes?.root,
        classes?.hover && `hover:${classes?.hover}`,
        selected && classes?.selected
      )}
    >
      <div className={mx('flex w-full pl-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap')} onClick={onClick}>
        {children}
      </div>
    </li>
  );
};
