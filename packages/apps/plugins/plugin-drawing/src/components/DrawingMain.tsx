//
// Copyright 2023 DXOS.org
//

import { Tldraw } from '@tldraw/tldraw';
import React, { FC } from 'react';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

import '@tldraw/tldraw/tldraw.css';

import { useDrawingModel } from './useDrawingModel';

export const DrawingMain: FC<{ data: [SpaceProxy, DrawingType] }> = ({ data }) => {
  const space = data[0];
  const drawing = data[data.length - 1] as DrawingType;
  const model = useDrawingModel(drawing);

  // https://tldraw.dev/docs/assets
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden bg-white dark:bg-neutral-925'>
      <Tldraw store={model.store} />
    </Main.Content>
  );
};
