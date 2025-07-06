//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type HasId } from './types';

// TODO(burdon): Contains surface like Kanban.

export type TileProps<T extends HasId = any> = ThemedClassName<{ item: T }>;

export const Tile = ({ classNames, item }: TileProps) => {
  return (
    <div
      className={mx(
        'absolute flex w-[16rem] h-[16rem] p-4 bg-inputSurface border border-separator rounded-sm shadow',
        classNames,
      )}
    >
      <h1>{item.id}</h1>
    </div>
  );
};
