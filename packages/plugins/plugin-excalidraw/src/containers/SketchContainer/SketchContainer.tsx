//
// Copyright 2024 DXOS.org
//

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawImperativeAPI, type ExcalidrawProps } from '@excalidraw/excalidraw/types';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Sketch } from '@dxos/plugin-sketch/types';
import { Flex, Panel, useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { useStoreAdapter } from '#hooks';
import { type Settings } from '#types';

export type SketchContainerProps = AppSurface.AttendableObjectProps<
  Sketch.Sketch,
  {
    settings: Settings.Settings;
  }
>;

/**
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const SketchContainer = ({ role, subject: sketch, attendableId }: SketchContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { themeMode } = useThemeContext();
  const [down, setDown] = useState<boolean>(false);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI>(null);
  const adapter = useStoreAdapter(sketch, {
    onUpdate: ({ elements }) => {
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

  const Comp = role === 'section' ? Container : Article;

  // NOTE: Min 500px height (for tools palette to be visible).
  // TODO(burdon): Disable scrolling with mouse pad unless focused.
  // TODO(burdon): Show live collaborators.
  //  https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger
  return (
    <Comp ref={containerRef}>
      <Excalidraw
        // Force instance per sketch object. Otherwise, sketch shares the same instance.
        key={attendableId}
        excalidrawAPI={(api) => (excalidrawAPIRef.current = api)}
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

const Article = composable<HTMLDivElement, PropsWithChildren>((props, forwardRef) => (
  <Panel.Root {...composableProps(props, { classNames: 'aspect-square' })} ref={forwardRef}>
    <Panel.Content>{props.children}</Panel.Content>
  </Panel.Root>
));

const Container = composable<HTMLDivElement, PropsWithChildren>((props, forwardRef) => (
  <Flex {...composableProps(props, { classNames: 'aspect-square' })} ref={forwardRef} />
));
