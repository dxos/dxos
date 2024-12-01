//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ObjectType = {
  typename: string;
  description?: string;
  icon?: string;
};

export type TypeSelectorProps = ThemedClassName<{
  types: ObjectType[];
  onSelect?: (typename: string) => void;
}>;

export const TypeSelector = ({ classNames, types, onSelect }: TypeSelectorProps) => {
  return (
    <div role='none' className={mx('flex flex-wrap gap-2', classNames)}>
      {types.map(({ typename, icon }) => (
        <div
          key={typename}
          className='flex w-[10rem] aspect-[4/1] overflow-hidden border border-separator rounded-md'
          onClick={() => onSelect?.(typename)}
        >
          <div className='flex items-center h-full px-2'>
            <Icon icon={icon ?? 'ph--placeholder--regular'} size={6} classNames='opacity-50' />
            <div className='px-2 truncate'>{typename}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
