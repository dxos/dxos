//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { forwardRef, type PropsWithChildren, useCallback, useImperativeHandle, useRef } from 'react';

import { Obj } from '@dxos/echo';
import { ScrollArea } from '@dxos/react-ui';
import { type MosaicStackTileComponent, Mosaic } from '@dxos/react-ui-mosaic';
import { composable, composableProps } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

//
// Context
//

const MATRIX_NAME = 'Matrix';

type MatrixContextValue = {
  /** Items to render. */
  items: Obj.Any[];
  /** Tile component to render for each item. */
  Tile: MosaicStackTileComponent<Obj.Any>;
  /** Currently focused tile ID. */
  current?: Obj.ID;
  /** Callback when the focused tile changes. */
  onCurrentChange?: (id: Obj.ID | undefined) => void;
  /** Register the viewport element for scroll operations. */
  registerViewport: (element: HTMLElement | null) => void;
};

const [MatrixProvider, useMatrixContext] = createContext<MatrixContextValue>(MATRIX_NAME);

//
// Controller
//

interface MatrixController {
  scrollTo: (id: Obj.ID) => void;
}

/**
 * Resolve the tile ID from a focusin event target by walking up to find `data-mosaic-tile-id`.
 */
const resolveTileId = (target: EventTarget | null): string | undefined => {
  const element = target as HTMLElement | null;
  return element?.closest<HTMLElement>('[data-mosaic-tile-id]')?.dataset?.mosaicTileId;
};

//
// Root
//

const MATRIX_ROOT_NAME = 'Matrix.Root';

type MatrixRootProps = PropsWithChildren<Partial<MatrixContextValue>>;

/**
 * Headless root that provides matrix context.
 */
const MatrixRoot = forwardRef<MatrixController, MatrixRootProps>(
  ({ children, items = [], Tile, current, onCurrentChange, ...props }, forwardedRef) => {
    const viewportRef = useRef<HTMLElement | null>(null);
    const registerViewport = useCallback((element: HTMLElement | null) => {
      viewportRef.current = element;
    }, []);

    useImperativeHandle(forwardedRef, () => ({
      scrollTo: (id) => {
        const viewport = viewportRef.current;
        if (!viewport) {
          return;
        }

        const tile = viewport.querySelector<HTMLElement>(`[data-mosaic-tile-id="${CSS.escape(id)}"]`);
        if (!tile) {
          return;
        }

        // Scroll tile to left edge of viewport.
        const tileRect = tile.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        const offset = tileRect.left - viewportRect.left + viewport.scrollLeft;
        viewport.scrollTo({ left: offset, behavior: 'smooth' });

        // Focus after scroll completes to avoid interrupting smooth scroll.
        // The focusin handler on the viewport will call onCurrentChange.
        const onScrollEnd = () => {
          viewport.removeEventListener('scrollend', onScrollEnd);
          tile.focus({ preventScroll: true });
        };
        viewport.addEventListener('scrollend', onScrollEnd);
      },
    }));

    return (
      <MatrixProvider
        items={items}
        Tile={Tile!}
        current={current}
        onCurrentChange={onCurrentChange}
        registerViewport={registerViewport}
        {...props}
      >
        {children}
      </MatrixProvider>
    );
  },
);

MatrixRoot.displayName = MATRIX_ROOT_NAME;

//
// Content
//

const MATRIX_CONTENT_NAME = 'Matrix.Content';

type MatrixContentProps = ComposableProps;

/**
 * Styled container wrapping Mosaic.Container for drag-and-drop support.
 */
const MatrixContent = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
  return (
    <Mosaic.Container ref={forwardedRef} classNames={className} orientation='horizontal' {...rest}>
      {children}
    </Mosaic.Container>
  );
});

MatrixContent.displayName = MATRIX_CONTENT_NAME;

//
// Viewport
//

const MATRIX_VIEWPORT_NAME = 'Matrix.Viewport';

type MatrixViewportProps = ComposableProps;

const getId = (item: Obj.Any) => item.id;

/**
 * Horizontally scrollable viewport that renders tiles from context.
 * Listens for focusin events to report the currently focused tile.
 */
const MatrixViewport = composable<HTMLDivElement>(({ ...props }, forwardedRef) => {
  const { items, Tile, onCurrentChange, registerViewport } = useMatrixContext(MATRIX_VIEWPORT_NAME);
  const viewportRef = useCallback(
    (element: HTMLElement | null) => {
      registerViewport(element);
    },
    [registerViewport],
  );

  const handleFocusIn = useCallback(
    (event: React.FocusEvent) => {
      const tileId = resolveTileId(event.target);
      if (tileId) {
        onCurrentChange?.(tileId);
      }
    },
    [onCurrentChange],
  );

  return (
    <ScrollArea.Root orientation='horizontal' padding snap {...composableProps(props)} ref={forwardedRef}>
      <ScrollArea.Viewport ref={viewportRef}>
        <div role='none' onFocusCapture={handleFocusIn}>
          <Mosaic.Stack
            orientation='horizontal'
            classNames='snap-x snap-mandatory gap-2'
            getId={getId}
            items={items}
            Tile={Tile}
            draggable={false}
          />
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

MatrixViewport.displayName = MATRIX_VIEWPORT_NAME;

//
// Matrix
//

export const Matrix = {
  Root: MatrixRoot,
  Content: MatrixContent,
  Viewport: MatrixViewport,
};

export type { MatrixController, MatrixRootProps, MatrixContentProps, MatrixViewportProps };
