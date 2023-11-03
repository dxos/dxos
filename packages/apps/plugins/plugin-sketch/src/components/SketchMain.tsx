//
// Copyright 2023 DXOS.org
//

import { type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type Sketch as SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { Main, useThemeContext } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout, mx } from '@dxos/react-ui-theme';

import '@tldraw/tldraw/tldraw.css';

import { useSketchStore } from '../hooks';

const styles = {
  background: '[&>div>span>div>div]:bg-white dark:[&>div>span>div>div]:bg-black',
};

export type SketchMainParams = {
  sketch: SketchType;
  readonly?: boolean;
};

export const SketchMain: FC<SketchMainParams> = ({ sketch }) => {
  const { themeMode } = useThemeContext();

  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.setDarkMode(themeMode === 'dark');

      // TODO(burdon): Config options.
      editor.setSnapMode(true);
      editor.setGridMode(true);
    }
  }, [editor, themeMode]);

  // const store = useSketchStore(sketch.data);
  // if (!store) {
  //   return null;
  // }

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
          styles.background,
        )}
      >
        <Tldraw autoFocus onMount={setEditor} />
      </div>
    </Main.Content>
  );
};
// store={store}
export const SketchSection: FC<SketchMainParams> = ({ sketch }) => {
  return <SketchReadonly sketch={sketch} maxHeight={400} />;
};

export const SketchSlide: FC<SketchMainParams> = ({ sketch }) => {
  return <SketchReadonly sketch={sketch} maxZoom={1.5} />;
};

// TODO(burdon): Generalize maxHeight as class.
export const SketchReadonly: FC<SketchMainParams & { maxHeight?: number; maxZoom?: number }> = ({
  sketch,
  maxHeight,
  maxZoom = 1,
}) => {
  const { themeMode } = useThemeContext();
  const store = useSketchStore(sketch.data);
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    editor?.setReadOnly(true);
    editor?.setDarkMode(themeMode === 'dark');
  }, [editor, themeMode]);

  // Zoom to fit.
  // TODO(burdon): Update height within range.
  const { ref: containerRef, width = 0, height: _height = 0 } = useResizeDetector();
  const height = maxHeight ?? _height;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    editor?.updateViewportScreenBounds();
  }, [editor, width, height]);

  // Zoom to fit.
  useEffect(() => {
    const zoomToFit = (animate = true) => {
      const commonBounds = editor?.allShapesCommonBounds;
      if (editor && width && height && commonBounds?.width && commonBounds?.height) {
        const padding = 40;
        // TODO(burdon): Objects culled (unstyled) if outside of bounds.
        const zoom = Math.min(
          maxZoom,
          (width - padding) / commonBounds.width,
          (height - padding) / commonBounds.height,
        );
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
  }, [editor, width, height]);

  return (
    <div
      ref={containerRef}
      className={mx('flex w-full h-full', styles.background)}
      style={{ height: maxHeight, visibility: ready ? 'visible' : 'hidden' }}
    >
      <Tldraw store={store} onMount={setEditor} hideUi={true} />
    </div>
  );
};
