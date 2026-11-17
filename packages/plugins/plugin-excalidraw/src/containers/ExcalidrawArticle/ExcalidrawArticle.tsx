//
// Copyright 2024 DXOS.org
//

// Excalidraw ships its stylesheet as a sibling asset rather than injecting it at runtime.
import '@excalidraw/excalidraw/index.css';
// Loaded after excalidraw's own stylesheet so the overrides win.
import './theme.css';

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import {
  type ExcalidrawImperativeAPI,
  type ExcalidrawProps,
  type NormalizedZoomValue,
} from '@excalidraw/excalidraw/types';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Util from '@dxos/react-ui/Util';

import { useStoreAdapter } from '#hooks';

export type ExcalidrawArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

const CAMERA_REPORT_MS = 100;

/** Scene object ids of the selected elements; unmanaged elements carry no `customData.object`. */
const selectedObjectIds = (
  elements: readonly ExcalidrawElement[],
  selectedElementIds: Readonly<Record<string, boolean>>,
): string[] => [
  ...new Set(
    elements.flatMap((element) =>
      selectedElementIds[element.id] && typeof element.customData?.object === 'string'
        ? [element.customData.object]
        : [],
    ),
  ),
];

const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((id) => right.includes(id));

type Camera = NonNullable<ExcalidrawArticleProps['camera']>;

const sameCamera = (left: Camera, right: Camera) =>
  left.x === right.x && left.y === right.y && left.zoom === right.zoom;

/** The scene point at the view's centre and the zoom, so a view of another size looks at the same place. */
const viewCamera = (api: ExcalidrawImperativeAPI): Camera => {
  const { width, height, scrollX, scrollY, zoom } = api.getAppState();
  return { x: width / (2 * zoom.value) - scrollX, y: height / (2 * zoom.value) - scrollY, zoom: zoom.value };
};

/** Excalidraw's zoom range, which its branded zoom value promises. */
const isNormalizedZoom = (value: number): value is NormalizedZoomValue => value >= 0.1 && value <= 30;

const applyCamera = (api: ExcalidrawImperativeAPI, camera: Camera) => {
  if (sameCamera(viewCamera(api), camera) || !isNormalizedZoom(camera.zoom)) {
    return;
  }
  const { width, height } = api.getAppState();
  api.updateScene({
    appState: {
      scrollX: width / (2 * camera.zoom) - camera.x,
      scrollY: height / (2 * camera.zoom) - camera.y,
      zoom: { value: camera.zoom },
    },
  });
};

/**
 * Article surface for the excalidraw variant: binds the canvas store adapter to an Excalidraw
 * instance and mirrors selection to and from the host in scene object ids.
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const ExcalidrawArticle = ({
  role,
  canvas,
  attendableId,
  selection,
  onSelectionChange,
  camera,
  onCameraChange,
}: ExcalidrawArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const containerRef = useRef<HTMLDivElement>(null);
  const themeMode = Hooks.useThemeMode();
  const [down, setDown] = useState<boolean>(false);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI>(null);
  // Last selection reported to the host, so its echo back through `selection` is a no-op.
  const reportedSelectionRef = useRef<readonly string[]>([]);
  // The host's current selection, readable from the adapter's update callback.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  // Buffer the most recent elements from the adapter so that however the adapter
  // and the <Excalidraw/> imperative API settle in (either order), we always hand
  // the current scene to the component once both are ready.
  const latestElementsRef = useRef<readonly ExcalidrawElement[]>([]);
  // The host's camera, applied once the API binds; and the last one reported, whose echo is not applied.
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const reportedCameraRef = useRef<Camera>(undefined);
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(cameraTimerRef.current), []);

  /** Select every element stamped with a selected scene object id. */
  const applySelection = (api: ExcalidrawImperativeAPI, elements: readonly ExcalidrawElement[]) => {
    const wanted = selectionRef.current;
    if (!wanted || sameSet(wanted, reportedSelectionRef.current)) {
      return;
    }
    // An empty host selection clears the editor's; the element check below is for non-empty ones.
    if (wanted.length === 0) {
      reportedSelectionRef.current = wanted;
      api.updateScene({ appState: { selectedElementIds: {} } });
      return;
    }
    const matched = elements.filter(
      (element) => typeof element.customData?.object === 'string' && wanted.includes(element.customData.object),
    );
    // Claim only the part of the selection that elements exist to carry: the adapter delivers
    // documents one update at a time, so an object still missing stays pending for the next.
    if (matched.length > 0) {
      reportedSelectionRef.current = wanted.filter((id) => matched.some(({ customData }) => customData?.object === id));
      api.updateScene({
        appState: { selectedElementIds: Object.fromEntries(matched.map((element) => [element.id, true as const])) },
      });
    }
  };

  const adapter = useStoreAdapter(canvas, {
    onUpdate: ({ elements }) => {
      latestElementsRef.current = elements;
      const api = excalidrawAPIRef.current;
      if (api) {
        api.updateScene({ elements });
        // Elements may arrive after the host set a selection; apply it now that they exist.
        applySelection(api, elements);
      }
    },
  });

  // TODO(burdon): The mouse position gets offset within the deck, so we trigger a resize, which resets the component.
  //  https://github.com/excalidraw/excalidraw/issues/7312
  //  https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/App.tsx
  useEffect(() => {
    const flash = () => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    flash();
    const deck = containerRef.current?.closest('article')?.parentElement;
    if (!deck) {
      return;
    }

    // Detect moved in deck.
    // TODO(burdon): Listen for scroll events on the deck instead.
    const observer = new MutationObserver(() => flash());
    observer.observe(deck, { attributes: false, childList: true, subtree: false });
    return () => observer.disconnect();
  }, []);

  // Menu action.
  const handleRefresh = () => {
    // excalidrawAPIRef.current?.setToast({ message: 'Refresh' });
    excalidrawAPIRef.current?.updateScene({ elements: adapter.getElements() });
  };

  // Track updates.
  const handleChange: ExcalidrawProps['onChange'] = (elements, appState) => {
    const modified = adapter.update(elements);
    if (!down && modified.length) {
      adapter.save();
    }
    if (onSelectionChange) {
      const selected = selectedObjectIds(elements, appState.selectedElementIds);
      if (!sameSet(selected, reportedSelectionRef.current)) {
        reportedSelectionRef.current = selected;
        onSelectionChange(selected);
      }
    }
  };

  // Selection, host → editor; the adapter's update path re-applies it once elements have loaded.
  useEffect(() => {
    const api = excalidrawAPIRef.current;
    if (api) {
      applySelection(api, adapter.getElements());
    }
  }, [adapter, selection]);

  // Camera, editor → host, at most once per interval while the view moves.
  const handleScrollChange: ExcalidrawProps['onScrollChange'] = () => {
    if (!onCameraChange || cameraTimerRef.current !== undefined) {
      return;
    }
    cameraTimerRef.current = setTimeout(() => {
      cameraTimerRef.current = undefined;
      const api = excalidrawAPIRef.current;
      if (api) {
        reportedCameraRef.current = viewCamera(api);
        onCameraChange(reportedCameraRef.current);
      }
    }, CAMERA_REPORT_MS);
  };

  // Camera, host → editor.
  useEffect(() => {
    const api = excalidrawAPIRef.current;
    if (api && camera && !(reportedCameraRef.current && sameCamera(reportedCameraRef.current, camera))) {
      applyCamera(api, camera);
    }
  }, [camera]);

  // Save updates when mouse is released.
  const handlePointerUpdate: ExcalidrawProps['onPointerUpdate'] = ({ button }) => {
    switch (button) {
      case 'down': {
        setDown(true);
        break;
      }

      case 'up': {
        if (down) {
          adapter.save();
        }
        setDown(false);
      }
    }
  };

  const Comp = role === AppSurface.Section.role ? Container : Article;

  // NOTE: Min 500px height (for tools palette to be visible).
  // TODO(burdon): Disable scrolling with mouse pad unless focused.
  // TODO(burdon): Show live collaborators.
  //  https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger
  return (
    <Comp ref={containerRef}>
      <Excalidraw
        // Force instance per sketch object. Otherwise, sketch shares the same instance.
        key={attendableId}
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
          // The adapter may have finished loading before the API bound — replay the
          // latest snapshot so the scene is never blank just because the two hooks
          // resolved in a different order.
          const buffered = latestElementsRef.current;
          if (buffered.length > 0) {
            api.updateScene({ elements: buffered });
          }
          if (cameraRef.current) {
            applyCamera(api, cameraRef.current);
          }
        }}
        initialData={{ elements: adapter.getElements() }}
        // gridModeEnabled={true}
        // detectScroll={false}
        theme={themeMode}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        onScrollChange={handleScrollChange}
      >
        <MainMenu>
          <MainMenu.Item onSelect={handleRefresh}>Refresh</MainMenu.Item>
        </MainMenu>
      </Excalidraw>
    </Comp>
  );
};

const Article = Util.composable<HTMLDivElement, PropsWithChildren>((props, forwardedRef) => (
  <Panel.Root
    {...Util.composableProps(props, { classNames: 'aspect-square w-full max-h-full min-h-0' })}
    ref={forwardedRef}
  >
    <Panel.Body>{props.children}</Panel.Body>
  </Panel.Root>
));

const Container = Util.composable<HTMLDivElement, PropsWithChildren>((props, forwardedRef) => (
  <Layout.Flex
    {...Util.composableProps(props, { classNames: 'aspect-square w-full max-h-full min-h-0' })}
    ref={forwardedRef}
  />
));
