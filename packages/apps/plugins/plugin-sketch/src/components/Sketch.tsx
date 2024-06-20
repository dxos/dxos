//
// Copyright 2023 DXOS.org
//

import '@tldraw/tldraw/tldraw.css';

import './theme.css';

import { type TLGridProps } from '@tldraw/editor';
import { DefaultGrid as DottedGrid, type Editor, Tldraw } from '@tldraw/tldraw';
import React, { type FC, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type SketchType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { CustomStylePanel, MeshGrid } from './custom';
import { useStoreAdapter } from '../hooks';
import { type SketchGridType } from '../types';

// NOTE(zan): Color overrides can be found in `/layers/tldraw.css` in `react-ui-theme`.

const gridComponents: Record<SketchGridType, FC<TLGridProps>> = {
  mesh: MeshGrid,
  dotted: DottedGrid,
};

export type SketchComponentProps = {
  sketch: SketchType;
  readonly?: boolean;
  className?: string;
  autoZoom?: boolean;
  maxZoom?: number;
  showControlsOnHover?: boolean;
  grid?: SketchGridType;
};

// TODO(burdon): Remove outline when focused (from tabster?)
const SketchComponent: FC<SketchComponentProps> = ({
  sketch,
  autoZoom,
  maxZoom = 1,
  readonly = false,
  className,
  showControlsOnHover,
  grid,
}) => {
  const { themeMode } = useThemeContext();
  const adapter = useStoreAdapter(sketch.canvas);
  const [active, setActive] = useState(!showControlsOnHover);
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

  // Ensure controls are visible when not in hover mode.
  useEffect(() => {
    if (!showControlsOnHover && !active) {
      setActive(true);
    }
  }, [showControlsOnHover]);

  // Zoom to fit.
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);
  useEffect(() => {
    if (!editor || !adapter || width === undefined || height === undefined) {
      return;
    }

    editor.zoomToFit({ animation: { duration: 0 } });
    editor.resetZoom();

    setReady(true);
    if (!autoZoom) {
      return;
    }

    const zoom = (animate = true) => {
      zoomToContent(editor, width, height, maxZoom, animate);
    };

    zoom(false);
    const onUpdate = debounce(zoom, 200);
    const subscription = readonly ? adapter.store!.listen(() => onUpdate(true), { scope: 'document' }) : undefined;
    return () => subscription?.();
  }, [editor, adapter, width, height, autoZoom]);

  if (!adapter.store) {
    return null;
  }

  // https://tldraw.dev/docs/user-interface
  return (
    <div
      role='none'
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx('is-full bs-full', className)}
      onPointerEnter={() => {
        if (showControlsOnHover) {
          setActive(!readonly && !adapter.readonly);
        }
      }}
      onPointerLeave={() => {
        if (showControlsOnHover) {
          setActive(false);
        }
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
          Grid: gridComponents[grid ?? 'mesh'],
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

/**
 * Zoom to fit content.
 */
const zoomToContent = (editor: Editor, width: number, height: number, maxZoom: number, animate = true) => {
  const commonBounds = editor.getCurrentPageBounds();
  if (width && height && commonBounds?.width && commonBounds?.height) {
    const padding = 60;
    // NOTE: Objects are culled (un-styled) if outside of bounds.
    const zoom = Math.min(maxZoom, (width - padding) / commonBounds.width, (height - padding) / commonBounds.height);
    const center = {
      x: (width - commonBounds.width * zoom) / 2 / zoom - commonBounds.minX,
      y: (height - commonBounds.height * zoom) / 2 / zoom - commonBounds.minY,
      z: zoom,
    };

    editor.setCamera(center, animate ? { animation: { duration: 250 } } : undefined);
  }
};

// TODO(burdon): Check new zoomToContent works in 2.1.4
// const zoomToContent = (animate = true) => {
//   editor?.zoomToContent({ duration: animate ? 250 : 0 });
//   setReady(true);
// };

export default SketchComponent;
