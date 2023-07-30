//
// Copyright 2023 DXOS.org
//

import { Editor, Tldraw } from '@tldraw/tldraw';
import React, { FC, useEffect, useState } from 'react';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main, useThemeContext } from '@dxos/aurora';
import { fullSurface, mx } from '@dxos/aurora-theme';

import '@tldraw/tldraw/tldraw.css';

import { useDrawingModel } from '../hooks';

export type DrawingMainParams = {
  readonly?: boolean;
  data: {
    object: DrawingType;
  };
};

export const DrawingSection: FC<DrawingMainParams> = ({ data: { object: drawing }, readonly = true }) => {
  // return (
  //   <pre className='m-0 p-0 ring'>
  //     <code>{JSON.stringify(drawing, undefined, 2)}</code>
  //   </pre>
  // );

  return <DrawingMain data={{ object: drawing }} readonly={readonly} />;
};

export const DrawingMain: FC<DrawingMainParams> = ({ data: { object: drawing }, readonly }) => {
  console.log('DrawingMain', drawing, drawing.content);
  const { store } = useDrawingModel(drawing.content);
  const { themeMode } = useThemeContext();
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    editor?.setDarkMode(themeMode === 'dark');
  }, [editor, themeMode]);

  // Tool events.
  const handleUiEvent = (name: string, data: any) => {
    // console.log('handleUiEvent', name, data);
  };

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Customize by using hooks directly: https://tldraw.dev/docs/editor
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  return (
    <Main.Content classNames={fullSurface}>
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
