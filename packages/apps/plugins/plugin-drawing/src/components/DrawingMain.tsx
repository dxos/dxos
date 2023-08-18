//
// Copyright 2023 DXOS.org
//

import { Editor, Tldraw } from '@tldraw/tldraw';
import React, { FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Drawing as DrawingType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { Main, useThemeContext } from '@dxos/aurora';
import { fixedFullLayout, mx } from '@dxos/aurora-theme';

import '@tldraw/tldraw/tldraw.css';

import { useDrawingModel } from '../hooks';

export type DrawingMainParams = {
  readonly?: boolean;
  data: {
    object: DrawingType;
  };
};

export const DrawingSection: FC<DrawingMainParams> = ({ data: { object: drawing }, readonly = true }) => {
  const { store } = useDrawingModel(drawing.data);
  const { themeMode } = useThemeContext();
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.setReadOnly(readonly);
      editor.setDarkMode(themeMode === 'dark');
    }
  }, [editor, readonly, themeMode]);

  // Zoom to fit.
  // TODO(burdon): Update height within range.
  const { ref: containerRef, width } = useResizeDetector();
  const [height, _setHeight] = useState<number>(300);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    editor?.updateViewportScreenBounds();
  }, [editor, width]);
  useEffect(() => {
    const zoomToFit = (animate = true) => {
      const commonBounds = editor?.allShapesCommonBounds;
      if (editor && width && commonBounds?.width && commonBounds?.height) {
        const padding = 40;
        const zoom = Math.min(1, (width - padding) / commonBounds.width, (height - padding) / commonBounds.height);
        const center = {
          x: (width - commonBounds.width * zoom) / 2 / zoom - commonBounds.minX,
          y: (height - commonBounds.height * zoom) / 2 / zoom - commonBounds.minY,
        };

        editor.animateCamera(center.x, center.y, zoom, animate ? { duration: 250 } : undefined);
        setReady(true);
      }
    };

    const onUpdate = debounce(zoomToFit, 200);
    const subscription = store.listen(() => onUpdate(true), { scope: 'document' });
    zoomToFit(false);
    return () => subscription();
  }, [editor, width]);

  return (
    <div ref={containerRef} style={{ height, visibility: ready ? 'visible' : 'hidden' }}>
      <Tldraw autoFocus store={store} hideUi={readonly} onMount={setEditor} />
    </div>
  );
};

export const DrawingMain: FC<DrawingMainParams> = ({ data: { object: drawing }, readonly = false }) => {
  const { store } = useDrawingModel(drawing.data);
  const { themeMode } = useThemeContext();
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.setReadOnly(readonly);
      editor.setDarkMode(themeMode === 'dark');

      // TODO(burdon): Config.
      editor.setSnapMode(true);
      editor.setGridMode(true);
    }
  }, [editor, readonly, themeMode]);

  // Tool events.
  const handleUiEvent = (name: string, data: any) => {
    // console.log('handleUiEvent', name, data);
  };

  // TODO(burdon): Error if switch DIRECTLY between drawings (store changed).

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Customize by using hooks directly: https://tldraw.dev/docs/editor
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  return (
    <Main.Content classNames={fixedFullLayout}>
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
