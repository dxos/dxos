//
// Copyright 2024 DXOS.org
//

// Excalidraw ships its stylesheet as a sibling asset rather than injecting it at runtime.
import '@excalidraw/excalidraw/index.css';

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { type ExcalidrawImperativeAPI, type ExcalidrawProps } from '@excalidraw/excalidraw/types';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Flex, Panel, composable, composableProps, useThemeContext } from '@dxos/react-ui';

import { useStoreAdapter } from '#hooks';
import { type Excalidraw as ExcalidrawTypes, type Settings } from '#types';

export type ExcalidrawArticleProps = AppSurface.ObjectArticleProps<
  ExcalidrawTypes.Excalidraw,
  {
    settings: Settings.Settings;
  }
>;

/**
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const ExcalidrawArticle = ({ role, subject: sketch, attendableId }: ExcalidrawArticleProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { themeMode } = useThemeContext();
  const [down, setDown] = useState<boolean>(false);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI>(null);
  // Buffer the most recent elements from the adapter so that however the adapter
  // and the <Excalidraw/> imperative API settle in (either order), we always hand
  // the current scene to the component once both are ready.
  const latestElementsRef = useRef<readonly ExcalidrawElement[]>([]);
  const adapter = useStoreAdapter(sketch, {
    onUpdate: ({ elements }) => {
      latestElementsRef.current = elements;
      excalidrawAPIRef.current?.updateScene({ elements });
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
  const handleChange: ExcalidrawProps['onChange'] = (elements) => {
    const modified = adapter.update(elements);
    if (!down && modified.length) {
      adapter.save();
    }
  };

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
