//
// Copyright 2023 DXOS.org
//

import { DragOverlay } from '@dnd-kit/core';
import React, { Component, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';

import { DensityProvider } from '@dxos/aurora';
import { raise } from '@dxos/debug';

import { MosaicContainerProps } from './Container';
import { DefaultComponent } from './DefaultComponent';
import { MosaicContext } from './Root';
import { MosaicTileComponent } from './Tile';
import { Path } from './util';

export type MosaicDragOverlayProps = { delay?: number; debug?: boolean } & Omit<
  React.ComponentProps<typeof DragOverlay>,
  'children'
>;

/**
 * Render the currently dragged item of the Mosaic.
 */
export const MosaicDragOverlay = ({ delay = 200, debug = false, ...overlayProps }: MosaicDragOverlayProps) => {
  const { containers, activeItem, overItem } = useContext(MosaicContext) ?? raise(new Error('Missing MosaicContext'));

  // Get the overlay component from the over container, otherwise default to the original.
  const [{ container, OverlayComponent }, setContainer] = useState<{
    container?: MosaicContainerProps<any> | undefined;
    OverlayComponent?: MosaicTileComponent<any> | undefined;
  }>({});

  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (activeItem) {
      let container: MosaicContainerProps<any> | undefined;
      let OverlayComponent: MosaicTileComponent<any> | undefined;
      if (overItem?.container) {
        container = containers.get(Path.first(overItem.container));
        OverlayComponent = container?.Component;
      }

      if (!OverlayComponent) {
        container = containers.get(Path.first(activeItem.container));
        OverlayComponent = container?.Component ?? DefaultComponent;
      }

      // Prevent jitter when transitioning across containers.
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setContainer({ container, OverlayComponent }), timer.current ? delay : 0);
    }
  }, [activeItem, overItem]);

  if (!activeItem?.container || !container || !OverlayComponent) {
    return null;
  }

  return (
    <DragOverlay {...overlayProps}>
      <div style={{ ...container.getOverlayStyle?.() }}>
        <OverlayErrorBoundary>
          {/* TODO(burdon): Configure density via getOverlayProps. */}
          <DensityProvider density='fine'>
            <OverlayComponent
              {...container.getOverlayProps?.()}
              item={activeItem.item}
              container={activeItem.container}
              isActive={true}
            />
            {debug && (
              <div className='flex mt-1 p-1 bg-neutral-50 text-xs border rounded overflow-hidden gap-1'>
                <span className='truncate'>
                  <span className='text-neutral-400'>container </span>
                  {container.id}
                </span>
                <span className='truncate'>
                  <span className='text-neutral-400'>item </span>
                  {activeItem.item.id.slice(0, 8)}
                </span>
              </div>
            )}
          </DensityProvider>
        </OverlayErrorBoundary>
      </div>
    </DragOverlay>
  );
};

class OverlayErrorBoundary extends Component<PropsWithChildren> {
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override state = {
    error: null,
  };

  override componentDidCatch(error: any, info: any) {
    console.warn(error, info);
  }

  // TODO(burdon): Fallback to using active item's original container.
  override render() {
    if (this.state.error) {
      return <p>ERROR: ${String(this.state.error)}</p>;
    }

    return this.props.children;
  }
}
