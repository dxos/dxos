//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type TileProps = ThemedClassName;

export const Tile = ({ classNames }: TileProps) => {
  return (
    <div className={mx('flex p-4 bg-inputSurface border border-separator rounded-sm shadow', classNames)}>
      <h1>Tile</h1>
    </div>
  );
};
