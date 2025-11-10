//
// Copyright 2024 DXOS.org
//

import '@tldraw/tldraw/tldraw.css';

import { getAssetUrls } from '@tldraw/assets/selfHosted';
import { type TLEventInfo, type TLGridProps, type TLInstance } from '@tldraw/editor';
import { DefaultToolbar, type Editor, type TLUiAssetUrlOverrides, Tldraw } from '@tldraw/tldraw';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type FC, useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { debounce } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStoreAdapter } from '../../hooks';
import { type Diagram, type SketchGridType, type SketchSettingsProps } from '../../types';
import { handleSnap } from '../actions';
import { CustomMenu, CustomStylePanel, DefaultToolbarContent, DottedGrid, MeshGrid } from '../custom';

import './theme.css';

const threadToolId = 'thread';

const gridComponents: Record<SketchGridType, FC<TLGridProps>> = {
  mesh: MeshGrid,
  dotted: DottedGrid,
};

export type SketchProps = ThemedClassName<{
  sketch: Diagram.Diagram;
  readonly?: boolean;
  autoZoom?: boolean;
  maxZoom?: number;
  hideUi?: boolean;
  assetsBaseUrl?: string | null;
  settings?: SketchSettingsProps;
  onThreadCreate?: () => void;
}>;

export const Sketch = ({
  sketch,
  readonly = false,
  autoZoom = true,
  maxZoom = 1,
  hideUi = false,
  classNames,
  assetsBaseUrl = '/assets/plugin-sketch',
  settings,
  onThreadCreate,
}: SketchProps) => {
  const adapter = useStoreAdapter(sketch);
  const [editor, setEditor] = useState<Editor>();

  // Focus.
  useEffect(() => {
    hideUi ? editor?.blur() : editor?.focus();
  }, [hideUi, editor]);

  // Editor State.
  useEffect(() => {
    if (!settings) {
      return;
    }

    const cleanup = editor?.store.listen(
      ({ changes: { updated } }) => {
        for (const [id, [from, to]] of Object.entries(updated)) {
          if (id === 'instance:instance') {
            const fromInstance = from as TLInstance;
            const toInstance = to as TLInstance;
            if (fromInstance.isGridMode !== toInstance.isGridMode) {
              settings.showGrid = toInstance.isGridMode;
            }
          }
        }
      },
      { source: 'user', scope: 'all' },
    );

    // TODO(burdon): Combine.
    return () => cleanup?.();
  }, [settings, editor]);

  // Editor events.
  useEffect(() => {
    // https://tldraw.dev/examples/editor-api/canvas-events
    const handleEvent = ({ type, name }: TLEventInfo) => {
      if (type === 'pointer' && name === 'pointer_up') {
        adapter.save();
      }
    };

    editor?.on('event', handleEvent);
    return () => {
      editor?.off('event', handleEvent);
    };
  }, [adapter, editor]);

  // UI state.
  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({
        // TODO(burdon): Adjust snap threshold.
        isSnapMode: true,
      });
      editor.updateInstanceState({
        isGridMode: settings?.showGrid !== false && !hideUi,
        isReadonly: readonly || hideUi,
      });
    }
  }, [editor, settings, hideUi, readonly]);

  // Zoom to fit.
  const { ref: containerRef, width = 0, height } = useResizeDetector();
  const [ready, setReady] = useState(!autoZoom);
  useEffect(() => {
    if (!editor || !adapter || width === undefined || height === undefined) {
      return;
    }

    // Set frame so that top left of grid is inset with our border (if no content).
    editor.setCamera({ x: -1, y: -1, z: 1 }, { animation: { duration: 0 } });
    editor.resetZoom();

    setReady(true);
    if (!autoZoom) {
      return;
    }

    const zoom = (animate = true) => {
      zoomToFit(editor, width, height, maxZoom, animate);
    };

    zoom(false);
    const onUpdate = debounce(zoom, 200);
    const subscription = readonly ? adapter.store?.listen(() => onUpdate(true), { scope: 'document' }) : undefined;
    return () => subscription?.();
  }, [editor, adapter, width, height, autoZoom]);

  // NOTE: Currently copying assets to composer-app public/assets/tldraw.
  // https://tldraw.dev/installation#Self-hosting-static-assets
  const assetUrls: TLUiAssetUrlOverrides = useMemo(() => {
    if (!assetsBaseUrl) {
      return undefined;
    }

    return defaultsDeep(
      {
        // Change default draw font.
        // TODO(burdon): Change icon to match font.
        fonts: { draw: `${assetsBaseUrl}/fonts/Montserrat-Regular.woff2` },
        icons: {
          'thread-icon': `${assetsBaseUrl}/icons/icon/chat-teardrop-text.svg`,
        },
      },
      getAssetUrls({ baseUrl: assetsBaseUrl }),
    );
  }, [assetsBaseUrl]);

  const overrides = useMemo(
    () => ({
      actions: (_editor: Editor, actions: any, _helpers: any) => ({
        ...actions,
        snap: {
          id: 'grid-snap',
          label: 'Snap',
          kbd: 's',
          icon: 'horizontal-align-middle',
          onSelect: () => {
            void handleSnap(sketch);
          },
        },
      }),
      tools: (_editor: Editor, tools: any) => {
        const newTools = { ...tools };
        newTools[threadToolId] = {
          id: threadToolId,
          icon: 'thread-icon',
          label: 'Comment', // TODO(Zan): Use translation lookup here.
          onSelect: () => onThreadCreate?.(),
        };
        return newTools;
      },
    }),
    [sketch, onThreadCreate],
  );

  const components = useMemo(
    () => ({
      DebugPanel: null,
      Grid: gridComponents[settings?.gridType ?? 'mesh'],
      HelpMenu: null,
      MenuPanel: CustomMenu,
      NavigationPanel: null,
      StylePanel: CustomStylePanel,
      TopPanel: null,
      ZoomMenu: null,
      Toolbar: (props: any) => (
        <DefaultToolbar {...props}>
          <DefaultToolbarContent toolsToSplice={[{ toolId: 'thread', position: 8 }]} />
        </DefaultToolbar>
      ),
    }),
    [settings],
  );

  if (!adapter.store) {
    return null;
  }

  return (
    <div
      role='none'
      ref={containerRef}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={mx('is-full bs-full', classNames)}
    >
      <Tldraw
        key={Obj.getDXN(sketch).toString()}
        store={adapter.store}
        hideUi={hideUi}
        inferDarkMode
        className='!outline-none'
        maxAssetSize={1024 * 1024}
        assetUrls={assetUrls}
        overrides={overrides}
        components={components}
        onMount={setEditor}
      />
    </div>
  );
};

/**
 * Zoom to fit content.
 */
const zoomToFit = (editor: Editor, width: number, height: number, maxZoom: number, animate = true) => {
  const commonBounds = editor.getCurrentPageBounds();
  if (width && height && commonBounds?.width && commonBounds?.height) {
    const padding = 60;
    // NOTE: Objects are "culled" (un-styled) if outside of bounds.
    const zoom = Math.min(maxZoom, (width - padding) / commonBounds.width, (height - padding) / commonBounds.height);
    const center = {
      x: (width - commonBounds.width * zoom) / 2 / zoom - commonBounds.minX,
      y: (height - commonBounds.height * zoom) / 2 / zoom - commonBounds.minY,
      z: zoom,
    };

    editor.setCamera(center, animate ? { animation: { duration: 250 } } : undefined);
  }
};
