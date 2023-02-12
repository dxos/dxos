//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type ListClasses = {
  root?: string;
};

export type ListProps = { classes?: ListClasses; children?: ReactNode };

/**
 * @deprecated
 */
export const List: FC<ListProps> = ({ classes, children }) => {
  return <ul className={mx('flex flex-col w-full overflow-hidden', classes?.root)}>{children}</ul>;
};

export type ListItemClasses = {
  root?: string;
  hover?: string;
  selected?: string;
};

export type ListItemProps = {
  selected?: boolean;
  classes?: ListItemClasses;
  children?: ReactNode;
  onClick?: () => void;
};

/**
 * @deprecated
 */
export const ListItemButton: FC<ListItemProps> = ({ selected, classes, children, onClick }) => {
  return (
    <li
      className={mx(
        'flex w-full overflow-hidden items-center cursor-pointer',
        classes?.root,
        classes?.hover && `hover:${classes?.hover}`,
        selected && classes?.selected
      )}
    >
      <div className={mx('flex w-full px-2 py-1 items-center overflow-hidden')} onClick={onClick}>
        {children}
      </div>
    </li>
  );
};
