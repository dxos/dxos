//
// Copyright 2024 DXOS.org
//

import '@tldraw/tldraw/tldraw.css';
import './theme.css';

import { getAssetUrls } from '@tldraw/assets/selfHosted';
import { type TLEventInfo, type TLGridProps, type TLInstance } from '@tldraw/editor';
import { DefaultToolbar, type Editor, Tldraw, type TLUiAssetUrlOverrides } from '@tldraw/tldraw';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type FC, useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Obj } from '@dxos/echo';
import { useMergeRefs } from '@dxos/react-hooks';
import { composable, composableProps } from '@dxos/react-ui';

import { useStoreAdapter } from '#hooks';
import { type Settings, type Sketch } from '#types';

import { handleSnap } from '../actions';
import { CustomMenu, CustomStylePanel, DefaultToolbarContent, DottedGrid, MeshGrid } from '../custom';

const threadToolId = 'thread';

const gridComponents: Record<Settings.SketchGridType, FC<TLGridProps>> = {
  mesh: MeshGrid,
  dotted: DottedGrid,
};

export type SketchProps = {
  sketch: Sketch.Sketch;
  readonly?: boolean;
  autoCenter?: boolean;
  hideUi?: boolean;
  assetsBaseUrl?: string | null;
  settings?: Settings.Settings;
  onThreadCreate?: () => void;
};

export const SketchComponent = composable<HTMLDivElement, SketchProps>(
  (
    {
      sketch,
      readonly = false,
      autoCenter = true,
      hideUi = false,
      assetsBaseUrl = '/assets/plugin-sketch',
      settings,
      onThreadCreate,
      ...props
    },
    forwardedRef,
  ) => {
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
        if (readonly || hideUi) {
          editor.setCurrentTool('hand');
        }
      }
    }, [editor, settings, hideUi, readonly]);

    // Zoom to fit.
    const { ref: resizeRef, width = 0, height } = useResizeDetector();
    const containerRef = useMergeRefs([forwardedRef, resizeRef]);
    const [ready, setReady] = useState(!autoCenter);
    useEffect(() => {
      if (!editor || !adapter || width === undefined || height === undefined) {
        return;
      }

      const isLocked = readonly || hideUi;

      // Unlock to allow programmatic camera positioning.
      editor.setCameraOptions({ isLocked: false });

      // Set frame so that top left of grid is inset with our border (if no content).
      editor.setCamera({ x: -1, y: -1, z: 1 }, { animation: { duration: 0 } });
      editor.resetZoom();

      setReady(true);
      if (!autoCenter) {
        editor.setCameraOptions({ isLocked: isLocked });
        return;
      }

      const zoom = () => {
        zoomToFit(editor, width, height, false);
      };

      zoom();
      editor.setCameraOptions({ isLocked: isLocked });

      let timer: ReturnType<typeof setTimeout> | undefined;
      const onUpdate = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          editor.setCameraOptions({ isLocked: false });
          zoom();
          editor.setCameraOptions({ isLocked: isLocked });
        }, 200);
      };
      const subscription = isLocked ? adapter.store?.listen(() => onUpdate(), { scope: 'document' }) : undefined;
      return () => {
        clearTimeout(timer);
        subscription?.();
      };
    }, [editor, adapter, width, height, autoCenter, readonly, hideUi]);

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
        {...composableProps(props, { classNames: 'dx-expander' })}
        style={{ visibility: ready ? 'visible' : 'hidden' }}
        ref={containerRef}
      >
        <Tldraw
          key={Obj.getURI(sketch)}
          store={adapter.store}
          hideUi={hideUi}
          inferDarkMode
          className='outline-hidden!'
          maxAssetSize={1024 * 1024}
          assetUrls={assetUrls}
          overrides={overrides}
          components={components}
          onMount={setEditor}
        />
      </div>
    );
  },
);

/**
 * Fit content within the viewport and center it, zooming out for oversized content but never
 * magnifying past 100% (zoom is capped at 1).
 */
const zoomToFit = (editor: Editor, width: number, height: number, animate = true) => {
  const commonBounds = editor.getCurrentPageBounds();
  if (width && height && commonBounds?.width && commonBounds?.height) {
    const padding = 60;
    // Zoom out to fit oversized content; cap at 1 so small content is never zoomed in.
    const zoom = Math.min(1, (width - padding) / commonBounds.width, (height - padding) / commonBounds.height);
    const center = {
      x: (width - commonBounds.width * zoom) / 2 / zoom - commonBounds.minX,
      y: (height - commonBounds.height * zoom) / 2 / zoom - commonBounds.minY,
      z: zoom,
    };

    editor.setCamera(center, animate ? { animation: { duration: 250 } } : undefined);
  }
};
