//
// Copyright 2024 DXOS.org
//

// Excalidraw ships its stylesheet as a sibling asset rather than injecting it at runtime.
import '@excalidraw/excalidraw/index.css';
// Loaded after excalidraw's own stylesheet so the overrides win.
import './theme.css';

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { type ExcalidrawImperativeAPI, type ExcalidrawProps } from '@excalidraw/excalidraw/types';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { Flex, Panel, composable, composableProps, useThemeContext } from '@dxos/react-ui';

import { useStoreAdapter } from '#hooks';

export type ExcalidrawArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps;

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
}: ExcalidrawArticleProps) => {
  invariant(Obj.instanceOf(Drawing.Canvas, canvas));
  const containerRef = useRef<HTMLDivElement>(null);
  const { themeMode } = useThemeContext();
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

  /** Select every element stamped with a selected scene object id. */
  const applySelection = (api: ExcalidrawImperativeAPI, elements: readonly ExcalidrawElement[]) => {
    const wanted = selectionRef.current;
    if (!wanted || sameSet(wanted, reportedSelectionRef.current)) {
      return;
    }
    const selectedElementIds = Object.fromEntries(
      elements
        .filter(
          (element) => typeof element.customData?.object === 'string' && wanted.includes(element.customData.object),
        )
        .map((element) => [element.id, true as const]),
    );
    // Only claim the selection once elements exist to carry it; an early call would record it
    // as applied while selecting nothing.
    if (Object.keys(selectedElementIds).length > 0) {
      reportedSelectionRef.current = wanted;
      api.updateScene({ appState: { selectedElementIds } });
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
        }}
        initialData={{ elements: adapter.getElements() }}
        // gridModeEnabled={true}
        // detectScroll={false}
        theme={themeMode}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
      >
        <MainMenu>
          <MainMenu.Item onSelect={handleRefresh}>Refresh</MainMenu.Item>
        </MainMenu>
      </Excalidraw>
    </Comp>
  );
};

const Article = composable<HTMLDivElement, PropsWithChildren>((props, forwardedRef) => (
  <Panel.Root {...composableProps(props, { classNames: 'aspect-square' })} ref={forwardedRef}>
    <Panel.Content>{props.children}</Panel.Content>
  </Panel.Root>
));

const Container = composable<HTMLDivElement, PropsWithChildren>((props, forwardedRef) => (
  <Flex {...composableProps(props, { classNames: 'aspect-square' })} ref={forwardedRef} />
));
