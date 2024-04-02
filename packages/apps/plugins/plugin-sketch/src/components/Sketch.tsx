//
// Copyright 2023 DXOS.org
//

import '@tldraw/tldraw/tldraw.css';

import { DefaultGrid, type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SketchType } from '@braneframe/types';
import { type TextObject } from '@dxos/echo-schema';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Vite config: https://github.com/tldraw/examples/tree/main/tldraw-vite-example
// TODO(burdon): Self-hosted: https://docs.tldraw.dev/usage#Self-hosting-static-assets

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
      editor.user.updateUserPreferences({
        isDarkMode: themeMode === 'dark',
        isSnapMode: !readonly,
      });
      editor.updateInstanceState({
        isGridMode: true,
        isReadonly: !!readonly,
      });
    }
  }, [editor, themeMode]);

  const store = useStoreAdapter(sketch.data as unknown as TextObject);

  // Zoom to fit.
  // TODO(burdon): !!!
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);
  useEffect(() => {
    if (!autoZoom) {
      return;
    }

    setReady(true);
    /*
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
    */
  }, [editor, width, height]);

  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  return (
    <div
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx(
        'w-full h-full',
        // styles.background, // TODO(burdon): ???
        className,
      )}
    >
      {/* NOTE: Key forces unmount; otherwise throws error. */}
      <Tldraw
        key={sketch.id}
        store={store}
        components={{
          DebugMenu: null,
          Grid: DefaultGrid,
          HelpMenu: null,
          MenuPanel: null,
          NavigationPanel: null,
          TopPanel: null,
          ZoomMenu: null,
        }}
        hideUi={readonly}
        onMount={setEditor}
      />
    </div>
  );
};

export default SketchComponent;
