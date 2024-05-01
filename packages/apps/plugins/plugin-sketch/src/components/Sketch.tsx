//
// Copyright 2023 DXOS.org
//

import '@tldraw/tldraw/tldraw.css';

import { DefaultGrid, type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStoreAdapter } from '../hooks';

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
        isSnapMode: true,
      });
      editor.updateInstanceState({
        isGridMode: !readonly,
        isReadonly: !!readonly,
      });
    }
  }, [editor, themeMode]);

  // TODO(dmaretskyi): Handle nullability.
  const store = useStoreAdapter(sketch.data!);

  // Zoom to fit.
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);
  useEffect(() => {
    editor?.zoomToFit({ duration: 0 });
    editor?.resetZoom();
    if (!autoZoom) {
      return;
    }

    // TODO(burdon): Supported in 2.1.4
    // const zoomToContent = (animate = true) => {
    //   editor?.zoomToContent({ duration: animate ? 250 : 0 });
    //   setReady(true);
    // };

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

  // https://tldraw.dev/docs/user-interface
  // https://github.com/tldraw/tldraw/blob/main/packages/ui/src/lib/TldrawUi.tsx
  // https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples
  // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
  // TODO(burdon): Fonts are hard coded in TextStylePickerSet.
  // https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/ui/components/StylePanel/DefaultStylePanelContent.tsx
  // https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/styles.tsx
  return (
    <div
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx('w-full h-full', className)}
    >
      {/* NOTE: Key forces unmount; otherwise throws error. */}
      {/*
        TODO(burdon): Error when navigating between pages.
          TypeError: Cannot read properties of undefined (reading 'currentPageId')
          return this.getInstanceState().currentPageId;
      */}
      <Tldraw
        // Setting the key forces re-rendering when the content changes.
        key={sketch.id}
        store={store}
        hideUi={readonly}
        components={{
          DebugPanel: null,
          Grid: DefaultGrid,
          HelpMenu: null,
          MenuPanel: null,
          NavigationPanel: null,
          TopPanel: null,
          ZoomMenu: null,
        }}
        onMount={setEditor}
      />
    </div>
  );
};

export default SketchComponent;
