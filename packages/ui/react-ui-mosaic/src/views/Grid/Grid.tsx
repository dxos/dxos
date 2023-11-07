//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { PlusCircle } from '@phosphor-icons/react';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { type FC, useState, useMemo, useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Button, useMediaQuery } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import {
  calculateCellWidth,
  createMatrix,
  getBounds,
  getDimension,
  getPanelBounds,
  type Dimension,
  type Position,
  type Size,
} from './layout';
import {
  type MosaicContainerProps,
  type MosaicDataItem,
  type MosaicTileAction,
  Mosaic,
  Path,
  useMosaic,
} from '../../mosaic';

//
// Selection
//

// TODO(burdon): Factor out as mosaic standard.
type ControlledSelection = {
  selected?: string;
  onSelect?: (id: string) => void;
};

//
// Context.
//

type GridOptions = {
  size: Size;
  cellBounds: Dimension;
  spacing?: number;
};

const defaultGridOptions: GridOptions = {
  size: { x: 8, y: 8 },
  cellBounds: { width: 272, height: 272 },
  spacing: 6,
};

//
// Container.
//

export type GridLayout = { [id: string]: Position };

export type GridProps<TData extends MosaicDataItem = MosaicDataItem> = MosaicContainerProps<TData, Position> &
  ControlledSelection & {
    items?: TData[];
    layout?: GridLayout;
    options?: Partial<GridOptions>;
    margin?: boolean;
    square?: boolean;
    debug?: boolean;
    onCreate?: (position: Position) => void;
    onAction?: (action: MosaicTileAction) => void; // TODO(burdon): Standardize across mosaics?
  };

/**
 * Grid content.
 */
// TODO(burdon): Make generic (and forwardRef).
export const Grid = ({
  id,
  items = [],
  layout = {},
  options: opts,
  margin,
  square = true,
  debug,
  selected: controlledSelected,
  Component = Mosaic.DefaultComponent,
  className,
  onDrop,
  onOver,
  onSelect,
  onCreate,
  onAction,
}: GridProps) => {
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });
  const options = defaultsDeep({}, opts, defaultGridOptions);
  const { matrix, bounds, cellBounds } = useMemo(() => {
    // Change default cell bounds to screen width if mobile.
    const cellWidth = calculateCellWidth(options.cellBounds.width, width ?? 0);
    const cellBounds = {
      width: cellWidth,
      height: square ? cellWidth : options.cellBounds.height,
    };

    return {
      matrix: createMatrix(options.size, ({ x, y }) => ({ x, y })),
      bounds: getPanelBounds(options.size, cellBounds, options.spacing),
      cellBounds,
    };
  }, [options, width]);

  // No margin if mobile.
  const [isNotMobile] = useMediaQuery('md');
  const marginSize = margin && !isNotMobile ? Math.max(cellBounds.width, cellBounds.height) : 0;

  const [selected, setSelected] = useState(controlledSelected);
  useEffect(() => {
    setSelected(controlledSelected);
    if (controlledSelected) {
      scrollToCenter(controlledSelected);
    }
  }, [controlledSelected]);

  const scrollToCenter = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item && width && height) {
      const pos = getBounds(layout[item.id], cellBounds);
      const top = pos.top + marginSize - (height - cellBounds.height) / 2;
      const left = pos.left + marginSize - (width - cellBounds.width) / 2;
      containerRef.current!.scrollTo({ top, left, behavior: 'smooth' });
    }
  };

  // TODO(burdon): Focus ring/navigation.
  // TODO(burdon): Set center point on container (via translation?) Scale container to zoom.
  const handleSelect = (id: string) => {
    setSelected(id);
    scrollToCenter(id);
    onSelect?.(id);
  };

  useEffect(() => {
    if (selected) {
      scrollToCenter(selected);
    }
  }, [selected, width, height]);

  return (
    <Mosaic.Container
      {...{
        id,
        Component,
        getOverlayProps: () => ({ grow: true }),
        getOverlayStyle: () => ({ display: 'flex', ...getDimension(cellBounds, options.spacing) }),
        onDrop,
        onOver,
      }}
    >
      <div className={mx('flex grow overflow-auto', className)}>
        {/* TODO(burdon): Tailwind classes aren't currently processed by labs. */}
        <div ref={containerRef} className={mx('grow overflow-auto snap-x md:snap-none snap-mandatory')}>
          <div className='group block relative' style={{ ...bounds, margin: marginSize }}>
            {matrix && (
              <div style={{ padding: options.spacing }}>
                <div className='relative'>
                  {matrix.map((row) =>
                    row.map(({ x, y }) => (
                      <GridCell
                        key={`${x}-${y}`}
                        path={id}
                        position={{ x, y }}
                        bounds={getBounds({ x, y }, cellBounds)}
                        padding={options.spacing}
                        onCreate={onCreate}
                      />
                    )),
                  )}
                </div>
              </div>
            )}

            <div>
              {items.map((item) => {
                const position = layout[item.id] ?? { x: 0, y: 0 };
                return (
                  <Mosaic.DraggableTile
                    key={item.id}
                    item={item}
                    path={id}
                    position={position}
                    Component={Component}
                    draggableStyle={{
                      position: 'absolute',
                      ...getBounds(position, cellBounds, options.spacing),
                    }}
                    onSelect={() => handleSelect(item.id)}
                    onAction={onAction}
                    // debug={debug}
                  />
                );
              })}
            </div>
          </div>

          {debug && <Mosaic.Debug data={{ items: items?.length }} position='bottom-right' />}
        </div>
      </div>
    </Mosaic.Container>
  );
};

/**
 * Grid cell.
 */
const GridCell: FC<{
  path: string;
  position: Position;
  bounds: Dimension;
  padding?: number;
  onCreate?: (position: Position) => void;
}> = ({ path, position, bounds, padding, onCreate }) => {
  const { overItem } = useMosaic();
  const isOverContainer = path === overItem?.path;
  const { setNodeRef, isOver } = useDroppable({
    id: Path.create(path, 'cell', `${position.x}-${position.y}`),
    data: { path, position },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ ...bounds, padding }}
      className='absolute flex justify-center items-center grow select-none cursor-pointer'
    >
      <div
        className={mx(
          'group/cell flex group-hover:flex w-full h-full items-center justify-center',
          'box-border border-dashed border-4 border-neutral-75 dark:border-neutral-850 rounded-lg',
          'transition ease-in-out duration-300',
          isOver && 'flex bg-neutral-75 dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800',
        )}
      >
        <div
          className={mx(
            'opacity-10 transition ease-in-out duration-300 group-hover/cell:opacity-100',
            isOverContainer && 'hidden',
          )}
        >
          {onCreate && (
            // TODO(burdon): Style button.
            <Button variant='ghost' onClick={() => onCreate(position)}>
              <PlusCircle className={getSize(8)} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
