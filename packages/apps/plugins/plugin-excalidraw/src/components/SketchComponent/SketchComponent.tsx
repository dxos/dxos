//
// Copyright 2024 DXOS.org
//

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { type ExcalidrawProps, type ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import React, { useEffect, useRef, useState } from 'react';

import { type DiagramType } from '@braneframe/types';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStoreAdapter } from '../../hooks';
import { type SketchGridType } from '../../types';

export type SketchComponentProps = {
  sketch: DiagramType;
  readonly?: boolean;
  className?: string;
  autoZoom?: boolean;
  maxZoom?: number;
  autoHideControls?: boolean;
  grid?: SketchGridType;
};

// TODO(burdon): Factor out.
const findAncestorBySelector = (node: Element, selector: string): Element | null => {
  while (node) {
    if (node.matches(selector)) {
      return node;
    }
    node = node.parentElement!;
  }

  return null;
};

/**
 * https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
 */
export const SketchComponent = ({ sketch, className }: SketchComponentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { themeMode } = useThemeContext();
  const [down, setDown] = useState<boolean>(false);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI>();
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
    const deck = findAncestorBySelector(containerRef.current!, 'article')?.parentElement;
    if (!deck) {
      return;
    }

    // Detect moved in deck.
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

  // TODO(burdon): Disable scrolling with mouse pad unless focused.
  // TODO(burdon): Show live collaborators.
  //  https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger
  return (
    <div ref={containerRef} className={mx('flex grow', className)}>
      <Excalidraw
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
    </div>
  );
};
