//
// Copyright 2024 DXOS.org
//

import { type Icon, CaretDown, CaretLeft, Circle, List } from '@phosphor-icons/react';
import React from 'react';

import { Button, type ClassNameValue, type Size } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

export const IconButton = ({
  Icon,
  classNames,
  size = 5,
  onClick,
}: {
  Icon: Icon;
  classNames?: ClassNameValue;
  size?: Size;
  onClick?: () => void;
}) => {
  return (
    <div className={mx('flex justify-center cursor-pointer', classNames)}>
      <Button variant='ghost' onClick={onClick}>
        <Icon className={getSize(size)} />
      </Button>
    </div>
  );
};

export type ItemProps = {
  id: string;
  open?: boolean;
  title: string;
  Icon: Icon;
  onChangeOpen: (open: boolean) => void;
};

export const ItemRow = ({ open, title, Icon, onChangeOpen }: ItemProps) => {
  return (
    <div className='group w-full grid grid-cols-[24px_24px_1fr_24px_24px] items-center'>
      <IconButton Icon={open ? CaretLeft : CaretDown} size={4} onClick={() => onChangeOpen(!open)} />
      {/* TODO(burdon): Drag handle. */}
      <IconButton Icon={Icon} />
      {/* TODO(burdon): Editable title. */}
      <div className='p-1'>{title}</div>
      <IconButton Icon={List} classNames='invisible group-hover:visible' />
      <IconButton Icon={Circle} size={4} />
    </div>
  );
};
