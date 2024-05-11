//
// Copyright 2023 DXOS.org
//

import './theme.css';
import '@tldraw/tldraw/tldraw.css';

import { type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { CustomGrid, CustomStylePanel } from './custom';
import { useStoreAdapter } from '../hooks';

export type SketchComponentProps = {
  sketch: SketchType;
  readonly?: boolean;
  className?: string;
  autoZoom?: boolean;
  maxZoom?: number;
};

// TODO(burdon): Remove outline when focused (from tabster?)
const SketchComponent: FC<SketchComponentProps> = ({ sketch, autoZoom, maxZoom = 1, readonly = false, className }) => {
  const { themeMode } = useThemeContext();
  // TODO(burdon): Need to go read-only if syncing with peers that have migrated to newer schema.
  const adapter = useStoreAdapter(sketch.data!);
  const [active, setActive] = useState(false);
  const [editor, setEditor] = useState<Editor>();
  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({
        isDarkMode: themeMode === 'dark',
        isSnapMode: true,
      });
      editor.updateInstanceState({
        isGridMode: active,
        isReadonly: !active,
      });
    }
  }, [editor, active, themeMode]);

  // Zoom to fit.
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);
  useEffect(() => {
    if (!adapter.store) {
      return;
    }

    editor?.zoomToFit({ duration: 0 });
    editor?.resetZoom();
    if (!autoZoom) {
      return;
    }

    // TODO(burdon): Check new zoomToContent works in 2.1.4
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
    const subscription = readonly ? adapter.store.listen(() => onUpdate(true), { scope: 'document' }) : undefined;
    return () => subscription?.();
  }, [editor, adapter, width, height]);

  if (!adapter) {
    return null;
  }

  // https://tldraw.dev/docs/user-interface
  return (
    <div
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx('w-full h-full', className)}
      onPointerEnter={() => {
        setActive(!readonly && !adapter.readonly);
      }}
      onPointerLeave={() => {
        setActive(false);
      }}
    >
      {/* NOTE: Key forces unmount; otherwise throws error. */}
      <Tldraw
        // Setting the key forces re-rendering when the content changes.
        key={sketch.id}
        store={adapter.store}
        hideUi={!active}
        // TODO(burdon): Customize assets: https://tldraw.dev/docs/assets
        maxAssetSize={1024 * 1024}
        components={{
          DebugPanel: null,
          Grid: CustomGrid,
          HelpMenu: null,
          MenuPanel: null,
          NavigationPanel: null,
          StylePanel: CustomStylePanel,
          TopPanel: null,
          ZoomMenu: null,
        }}
        onMount={setEditor}
      />
    </div>
  );
};

export default SketchComponent;
