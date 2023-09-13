//
// Copyright 2023 DXOS.org
//

import { Editor, Tldraw } from '@tldraw/tldraw';
import React, { FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Sketch as SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { Main, useThemeContext } from '@dxos/aurora';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout, mx } from '@dxos/aurora-theme';

import '@tldraw/tldraw/tldraw.css';

import { useSketchStore } from '../hooks';

export type SketchMainParams = {
  readonly?: boolean;
  data: SketchType;
};

export const SketchMain: FC<SketchMainParams> = ({ data: object }) => {
  const { themeMode } = useThemeContext();
  const store = useSketchStore(object.data);

  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.setDarkMode(themeMode === 'dark');

      // TODO(burdon): Config options.
      editor.setSnapMode(true);
      editor.setGridMode(true);
    }
  }, [editor, themeMode]);

  if (!store) {
    return null;
  }

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Customize by using hooks directly: https://tldraw.dev/docs/editor
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <div
        className={mx(
          'h-full',
          // TODO(burdon): Override z-index.
          '[&>div>span>div]:z-0',
          // TODO(burdon): Hide .tlui-menu-zone
          '[&>div>main>div:nth-child(1)>div:nth-child(1)]:hidden',
          // TODO(burdon): Hide .tlui-navigation-zone
          '[&>div>main>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)]:hidden',
          // TODO(burdon): Hide .tlui-help-menu
          '[&>div>main>div:nth-child(2)>div:nth-child(1)>div:nth-child(3)]:hidden',
          // TODO(burdon): Hide .tlui-debug-panel
          '[&>div>main>div:nth-child(2)>div:nth-child(2)]:hidden',
        )}
      >
        <Tldraw autoFocus store={store} onMount={setEditor} />
      </div>
    </Main.Content>
  );
};

export const SketchSection: FC<SketchMainParams> = ({ data: sketch }) => {
  const { themeMode } = useThemeContext();
  const store = useSketchStore(sketch.data);
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.setReadOnly(true);
      editor.setDarkMode(themeMode === 'dark');
    }
  }, [editor, themeMode]);

  // Zoom to fit.
  // TODO(burdon): Update height within range.
  const { ref: containerRef, width } = useResizeDetector();
  const [height] = useState<number>(400);
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
      <Tldraw store={store} onMount={setEditor} hideUi={true} />
    </div>
  );
};
