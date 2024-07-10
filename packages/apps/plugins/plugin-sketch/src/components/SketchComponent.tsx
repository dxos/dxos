//
// Copyright 2023 DXOS.org
//

import '@tldraw/tldraw/tldraw.css';

import { getAssetUrls } from '@tldraw/assets/selfHosted';
import { type TLGridProps } from '@tldraw/editor';
import { type Editor, Tldraw } from '@tldraw/tldraw';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type FC, useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type DiagramType } from '@braneframe/types';
import { debounce } from '@dxos/async';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { useHasAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

import { CustomStylePanel, DottedGrid, MeshGrid } from './custom';
import { useStoreAdapter } from '../hooks';
import { type SketchGridType } from '../types';

import './theme.css';

// NOTE(zan): Color overrides can be found in `/layers/tldraw.css` in `react-ui-theme`.

const gridComponents: Record<SketchGridType, FC<TLGridProps>> = {
  mesh: MeshGrid,
  dotted: DottedGrid,
};

export type SketchComponentProps = {
  sketch: DiagramType;
  readonly?: boolean;
  className?: string;
  autoZoom?: boolean;
  maxZoom?: number;
  autoHideControls?: boolean;
  grid?: SketchGridType;
  assetsBaseUrl?: string | null;
};

// TODO(burdon): Remove outline when focused (from tabster?)
const SketchComponent: FC<SketchComponentProps> = ({
  sketch,
  autoZoom,
  maxZoom = 1,
  readonly = false,
  className,
  autoHideControls,
  grid,
  assetsBaseUrl = '/assets/plugin-sketch',
}) => {
  const { themeMode } = useThemeContext();
  const adapter = useStoreAdapter(sketch.canvas);
  const [active, setActive] = useState(!autoHideControls);
  const [editor, setEditor] = useState<Editor>();

  const attended = useHasAttention(fullyQualifiedId(sketch));

  useEffect(() => {
    attended ? editor?.focus() : editor?.blur();
  }, [attended, editor]);

  // NOTE: Currently copying assets to composer-app public/assets/tldraw.
  // https://tldraw.dev/installation#Self-hosting-static-assets
  const assetUrls = useMemo(() => {
    if (!assetsBaseUrl) {
      return undefined;
    }

    return defaultsDeep(
      {
        // Change default draw font.
        // TODO(burdon): Change icon to match font.
        fonts: {
          draw: `${assetsBaseUrl}/fonts/Montserrat-Regular.woff2`,
        },
      },
      getAssetUrls({ baseUrl: assetsBaseUrl }),
    );
  }, [assetsBaseUrl]);

  // UI state.
  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({
        isSnapMode: true,
      });
      editor.updateInstanceState({
        isGridMode: active,
        isReadonly: readonly || !active,
      });
    }
  }, [editor, active, readonly, themeMode]);

  // Ensure controls are visible when not in hover mode.
  useEffect(() => {
    if (!autoHideControls && !active) {
      setActive(true);
    }
  }, [autoHideControls]);

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

  return (
    <div
      role='none'
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx('is-full bs-full', className)}
      onPointerEnter={() => {
        if (autoHideControls) {
          setActive(!readonly && !adapter.readonly);
        }
      }}
      onPointerLeave={() => {
        if (autoHideControls) {
          setActive(false);
        }
      }}
    >
      {/* https://tldraw.dev/docs/user-interface */}
      {/* NOTE: Key forces unmount; otherwise throws error. */}
      <Tldraw
        // Setting the key forces re-rendering when the content changes.
        key={fullyQualifiedId(sketch)}
        store={adapter.store}
        hideUi={!active}
        inferDarkMode
        // https://tldraw.dev/docs/assets
        maxAssetSize={1024 * 1024}
        assetUrls={assetUrls}
        // https://tldraw.dev/installation#Customize-the-default-components
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
