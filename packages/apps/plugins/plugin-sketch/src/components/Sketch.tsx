//
// Copyright 2023 DXOS.org
//

import '@tldraw/tldraw/tldraw.css';

import { DefaultGrid, type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
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

  // TODO(burdon): Custom fonts.

  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({
        isDarkMode: themeMode === 'dark',
        isSnapMode: true,
      });
      editor.updateInstanceState({
        isGridMode: !readonly,
        isReadonly: !!readonly,
      });
    }
  }, [editor, themeMode]);

  const store = useStoreAdapter(sketch.data as unknown as TextObject);

  // Zoom to fit.
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);
  useEffect(() => {
    editor?.zoomToFit({ duration: 0 });
    editor?.resetZoom();
    if (!autoZoom) {
      return;
    }

    const zoomToContent = (animate = true) => {
      if (!editor) {
        return;
      }

      // Custom zoom to fit.
      const commonBounds = editor.getCurrentPageBounds();
      if (width && height && commonBounds?.width && commonBounds?.height) {
        const padding = 60;
        // NOTE: Objects are culled (un-styled) if outside of bounds.
        const zoom = Math.min(
          maxZoom,
          (width - padding) / commonBounds.width,
          (height - padding) / commonBounds.height,
        );

        const center = {
          x: (width - commonBounds.width * zoom) / 2 / zoom - commonBounds.minX,
          y: (height - commonBounds.height * zoom) / 2 / zoom - commonBounds.minY,
          z: zoom,
        };

        editor.setCamera(center, animate ? { duration: 250 } : undefined);
      }

      setReady(true);
    };

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
