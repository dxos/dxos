//
// Copyright 2023 DXOS.org
//

import { Editor, Tldraw } from '@tldraw/tldraw';
import React, { FC, useEffect, useState } from 'react';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

import '@tldraw/tldraw/tldraw.css';

import { useDrawingModel } from '../hooks';

export type DrawingMainOptions = {
  readonly: boolean;
};

export const DrawingMain: FC<{ data: [SpaceProxy, DrawingType] }> = ({ data }) => {
  // const space = data[0];
  const drawing = data[data.length - 1] as DrawingType;
  const { store } = useDrawingModel(drawing);
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {}, [editor]);

  // TODO(burdon): Config.
  const readonly = false;

  // Tool events.
  const handleUiEvent = (name: string, data: any) => {
    // console.log('handleUiEvent', name, data);
  };

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Z-index obscures aurora menus (e.g., hen expanded, the sidebar icon disappears.)
  // TODO(burdon): Customize by using hooks directly: https://tldraw.dev/docs/editor
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  // TODO(burdon): Dark mode.
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='h-screen'>
        <Tldraw autoFocus store={store} hideUi={readonly} onUiEvent={handleUiEvent} onMount={setEditor} />
      </div>
    </Main.Content>
  );
};
