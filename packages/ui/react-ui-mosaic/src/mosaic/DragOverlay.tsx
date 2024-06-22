//
// Copyright 2023 DXOS.org
//

import { DragOverlay } from '@dnd-kit/core';
import React, {
  Component,
  type ComponentProps,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';

import { type MosaicContainerProps } from './Container';
import { DefaultComponent } from './DefaultComponent';
import { type MosaicTileComponent } from './Tile';
import { useMosaic } from './hooks';
import { Path } from './util';

export type MosaicDragOverlayProps = { delay?: number; debug?: boolean } & Omit<
  ComponentProps<typeof DragOverlay>,
  'children'
>;

/**
 * Render the currently dragged item of the Mosaic.
 */
export const MosaicDragOverlay = ({ delay = 200, debug = false, ...overlayProps }: MosaicDragOverlayProps) => {
  const { containers, operation, activeItem, overItem } = useMosaic();

  // Get the overlay component from the over container, otherwise default to the original.
  const [state, setState] = useState<{
    container?: MosaicContainerProps<any>;
    OverlayComponent?: MosaicTileComponent<any>;
  }>({});

  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Only attempt to resolve a foreign overlay tile if the operation is not rejected, since droppables *should* reject
    // items they don’t recognize and therefore wouldn’t be able to render a tile for. See dxos/dxos#5082.
    if (activeItem && operation !== 'reject') {
      let container: MosaicContainerProps<any> | undefined;
      let OverlayComponent: MosaicTileComponent<any> | undefined;
      if (overItem?.path) {
        container = containers[Path.first(overItem.path)];
        OverlayComponent = container?.Component;
      }

      if (!OverlayComponent) {
        container = containers[Path.first(activeItem.path)];
        OverlayComponent = container?.Component ?? DefaultComponent;
      }

      // Prevent jitter when transitioning across containers.
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState({ container, OverlayComponent }), timer.current ? delay : 0);
    } else {
      setState({});
    }
  }, [activeItem, overItem]);

  // Ensure the overlay is rendered as soon as there's an active item, then use local state.
  const container = state.container ?? (activeItem && containers[Path.first(activeItem.path)]);
  const OverlayComponent = state.OverlayComponent ?? container?.Component;
  // Fallback is always to the active (origin) container.
  const FallbackComponent = (activeItem && containers[Path.first(activeItem.path)])?.Component ?? DefaultComponent;

  // NOTE: The DragOverlay wrapper element must always be mounted to support animations. Conditionally render the content.
  return (
    // TODO(burdon): Set custom animations (e.g., in/out/around).
    <DragOverlay adjustScale={false} {...overlayProps} style={{ ...container?.getOverlayStyle?.() }}>
      {/* TODO(burdon): Configure density via getOverlayProps. */}
      {activeItem?.path && container && OverlayComponent && (
        <OverlayErrorBoundary
          fallback={
            <FallbackComponent
              {...container.getOverlayProps?.()}
              item={activeItem.item}
              path={activeItem.path}
              operation={operation}
              active='overlay'
            />
          }
        >
          <OverlayComponent
            {...container.getOverlayProps?.()}
            item={activeItem.item}
            path={activeItem.path}
            type={activeItem.type}
            operation={operation}
            active='overlay'
          />
          {debug && (
            <div className='flex flex-wrap mt-1 p-1 bg-neutral-50 dark:bg-neutral-700 text-xs border rounded overflow-hidden gap-1'>
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
        </OverlayErrorBoundary>
      )}
    </DragOverlay>
  );
};

type OverlayErrorBoundaryProps = PropsWithChildren<{ fallback?: ReactNode }>;

class OverlayErrorBoundary extends Component<OverlayErrorBoundaryProps> {
  private readonly fallback: ReactNode;

  constructor(props: OverlayErrorBoundaryProps) {
    super(props);
    this.fallback = props.fallback ?? <p>ERROR: ${String(this.state.error)}</p>;
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override state = {
    error: null,
  };

  override componentDidCatch(error: any, info: any) {
    log.catch(error, { info });
  }

  override render() {
    if (this.state.error) {
      return this.fallback;
    }

    return this.props.children;
  }
}
