//
// Copyright 2023 DXOS.org
//

import { Editor, Tldraw } from '@tldraw/tldraw';
import React, { FC, useEffect, useState } from 'react';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main, useThemeContext } from '@dxos/aurora';
import { baseSurface, fullSurface, mx } from '@dxos/aurora-theme';

import '@tldraw/tldraw/tldraw.css';

import { useDrawingModel } from '../hooks';

export type DrawingMainOptions = {
  readonly: boolean;
};

// TODO(burdon): Have plugin create model?
export const DrawingMain: FC<{ data: { object: DrawingType } }> = ({ data: { object: drawing } }) => {
  const { store } = useDrawingModel(drawing);
  const { themeMode } = useThemeContext();
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    editor?.setDarkMode(themeMode === 'dark');
  }, [editor, themeMode]);

  // TODO(burdon): Config.
  const readonly = false;

  // Tool events.
  const handleUiEvent = (name: string, data: any) => {
    // console.log('handleUiEvent', name, data);
  };

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Customize by using hooks directly: https://tldraw.dev/docs/editor
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  return (
    <Main.Content classNames={[fullSurface, baseSurface, 'mb-8']}>
      <div
        className={mx(
          'h-full',
          // TODO(burdon): Hack to override z-index.
          '[&>div>span>div]:z-0',
          // TODO(burdon): Hack to hide menu.
          '[&>div>main>div:first-child>div:first-child>div]:invisible',
          // TODO(burdon): Hack to hide statusbar.
          '[&>div>main>div:nth-child(2)>div:nth-child(2)]:hidden',
        )}
      >
        <Tldraw autoFocus store={store} hideUi={readonly} onUiEvent={handleUiEvent} onMount={setEditor} />
      </div>
    </Main.Content>
  );
};
