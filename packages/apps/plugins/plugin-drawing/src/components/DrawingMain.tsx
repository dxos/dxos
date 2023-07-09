//
// Copyright 2023 DXOS.org
//

import { Tldraw } from '@tldraw/tldraw';
import React, { FC } from 'react';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

// TODO(burdon): Plugin?
import '@tldraw/tldraw/tldraw.css';

import { useDrawingModel } from '../hooks';

export const DrawingMain: FC<{ data: [SpaceProxy, DrawingType] }> = ({ data }) => {
  // const space = data[0];
  const drawing = data[data.length - 1] as DrawingType;
  const model = useDrawingModel(drawing);

  const readonly = false;

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Customize by using hooks directly: https://tldraw.dev/docs/editor
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  // TODO(burdon): Dark mode.
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='h-screen'>
        <Tldraw store={model.store} hideUi={readonly} />
      </div>
    </Main.Content>
  );
};
