//
// Copyright 2023 DXOS.org
//

import { type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Vite config: https://github.com/tldraw/examples/tree/main/tldraw-vite-example
// TODO(burdon): Self-hosted: https://docs.tldraw.dev/usage#Self-hosting-static-assets

import '@tldraw/tldraw/tldraw.css';

import { useStoreAdapter } from '../hooks';

// NOTE(Zan): Color overrides can be found in `/layers/tldraw.css` in `react-ui-theme`.

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

  // TODO(dmaretskyi): Handle nullability.
  const store = useStoreAdapter(sketch.data!);

  // Zoom to fit.
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);

  const zoomToContent = (animate = true) => {
    const commonBounds = editor?.allShapesCommonBounds;
    if (editor && width && height && commonBounds?.width && commonBounds?.height) {
      const padding = 40;
      // NOTE: Objects culled (unstyled) if outside of bounds.
      const zoom = Math.min(maxZoom, (width - padding) / commonBounds.width, (height - padding) / commonBounds.height);
      if (zoom <= 0) {
        throw new Error('Sketch has non-positive size.');
      }
      const center = {
        x: (width - commonBounds.width * zoom) / 2 / zoom - commonBounds.minX,
        y: (height - commonBounds.height * zoom) / 2 / zoom - commonBounds.minY,
      };
      editor.animateCamera(center.x, center.y, zoom, animate ? { duration: 250 } : undefined);
      setReady(true);
    }
  };

  useEffect(() => {
    if (!autoZoom || width < 1 || (height ?? 0) < 1) {
      return;
    }

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
      role='none'
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx(
        'is-full bs-full',
        '[&>div>span>div]:z-0',
        '[&_.tlui-menu-zone]:hidden',
        '[&_.tlui-navigation-zone]:hidden',
        '[&_.tlui-help-menu]:hidden',
        '[&_.tlui-debug-panel]:hidden',
        'attention-within',
        className,
      )}
    >
      {/* NOTE: Key forces unmount; otherwise throws error. */}
      <Tldraw key={sketch.id} store={store} hideUi={readonly} onMount={setEditor} />
    </div>
  );
};

export default SketchComponent;
