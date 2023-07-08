//
// Copyright 2023 DXOS.org
//

import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import React, { FC } from 'react';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main, useTranslation } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

import type { DrawingModel } from '../props';

console.log(Tldraw);

export const DrawingMain: FC<{ data: [SpaceProxy, DrawingType] }> = ({ data }) => {
  const { t } = useTranslation('dxos.org/plugin/drawing');

  const space = data[0];
  const Drawing = data[data.length - 1] as DrawingType;

  const model: DrawingModel = {
    root: Drawing,
  };

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden bg-white dark:bg-neutral-925'>
      <Tldraw />
    </Main.Content>
  );
};
