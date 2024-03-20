//
// Copyright 2023 DXOS.org
//

import { type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { type TextObject } from '@dxos/echo-schema';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Vite config: https://github.com/tldraw/examples/tree/main/tldraw-vite-example
// TODO(burdon): Self-hosted: https://docs.tldraw.dev/usage#Self-hosting-static-assets

import '@tldraw/tldraw/tldraw.css';

import { useStoreAdapter } from '../hooks';

const styles = {
  background: '[&>div>span>div>div]:bg-white dark:[&>div>span>div>div]:bg-black',
};

export type SketchComponentProps = {
  sketch: SketchType;
  readonly?: boolean;
  className?: string;
  autoZoom?: boolean;
  maxZoom?: number;
};

const SketchComponent: FC<SketchComponentProps> = ({ sketch, autoZoom, maxZoom = 1, readonly, className }) => {
  const { themeMode } = useThemeContext();

  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.setDarkMode(themeMode === 'dark');
      editor.setReadOnly(!!readonly);
      editor.setSnapMode(!readonly);
      editor.setGridMode(!readonly);
    }
  }, [editor, themeMode]);

  const store = useStoreAdapter(sketch.data as unknown as TextObject);

  // Zoom to fit.
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);
  useEffect(() => {
    if (!autoZoom) {
      return;
    }

    const zoomToContent = (animate = true) => {
      const commonBounds = editor?.allShapesCommonBounds;
      if (editor && width && height && commonBounds?.width && commonBounds?.height) {
        const padding = 40;
        // NOTE: Objects culled (unstyled) if outside of bounds.
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

    editor?.updateViewportScreenBounds();
    zoomToContent(false);

    const onUpdate = debounce(zoomToContent, 200);
    const subscription = store.listen(() => onUpdate(true), { scope: 'document' });
    return () => subscription();
  }, [editor, width, height]);

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  return (
    <div
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx(
        'w-full h-full',
        // 14Override z-index.
        '[&>div>span>div]:z-0',
        // 14Hide .tlui-menu-zone
        '[&>div>main>div:nth-child(1)>div:nth-child(1)]:hidden',
        // 14Hide .tlui-navigation-zone
        '[&>div>main>div:nth-child(2)>div:nth-child(1)>div:nth-child(1)]:hidden',
        // 14Hide .tlui-help-menu
        '[&>div>main>div:nth-child(2)>div:nth-child(1)>div:nth-child(3)]:hidden',
        // 14Hide .tlui-debug-panel
        '[&>div>main>div:nth-child(2)>div:nth-child(2)]:hidden',
        styles.background,
        className,
      )}
    >
      {/* NOTE: Key forces unmount; otherwise throws error. */}
      <Tldraw key={sketch.id} store={store} hideUi={readonly} onMount={setEditor} />
    </div>
  );
};

export default SketchComponent;
