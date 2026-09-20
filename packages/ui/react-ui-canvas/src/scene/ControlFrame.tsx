//
// Copyright 2026 DXOS.org
//

//
// Overlay in scene coordinates (§7 layer 3): selection outlines, resize handles, ports, the marquee and
// the link rubber band. Sizes are divided by zoom because the parent transform scales the SVG.
//

import React, { memo } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Drag, type Handle } from './atoms.ts';
import { cellBounds } from './camera.ts';
import { boundsFromPoints } from './hit.ts';
import { portPoint } from './ports.ts';
import { type CellRegistry } from './registry.ts';
import { curvePath } from './route.ts';
import { type Bounds, type CellId, type PlacedCell, type Point, type Port, type Scene, isPlaced } from './types.ts';

const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const handlePoint = (bounds: Bounds, handle: Handle): Point => {
  const x = handle.includes('w')
    ? bounds.x
    : handle.includes('e')
      ? bounds.x + bounds.width
      : bounds.x + bounds.width / 2;
  const y = handle.includes('n')
    ? bounds.y
    : handle.includes('s')
      ? bounds.y + bounds.height
      : bounds.y + bounds.height / 2;
  return { x, y };
};

const cursorFor = (handle: Handle) =>
  ({ n: 'ns', s: 'ns', e: 'ew', w: 'ew', ne: 'nesw', sw: 'nesw', nw: 'nwse', se: 'nwse' })[handle] + '-resize';

export type ControlFrameProps = {
  scene: Scene;
  registry: CellRegistry;
  selection: ReadonlySet<CellId>;
  hover?: CellId;
  zoom: number;
  drag?: Drag;
  /** Show every cell's ports (the `link` tool); otherwise only the hovered and selected cells'. */
  showPorts: boolean;
  onHandlePointerDown?: (cell: PlacedCell, handle: Handle, event: React.PointerEvent) => void;
  onPortPointerDown?: (cell: PlacedCell, port: Port, event: React.PointerEvent) => void;
};

export const ControlFrame = memo(
  ({
    scene,
    registry,
    selection,
    hover,
    zoom,
    drag,
    showPorts,
    onHandlePointerDown,
    onPortPointerDown,
  }: ControlFrameProps) => {
    const unit = 1 / Math.max(zoom, 0.05);
    const handleSize = 8 * unit;
    const portRadius = 5 * unit;
    const selected = [...selection]
      .map((id) => scene.cells[id])
      .filter((cell): cell is PlacedCell => cell !== undefined && isPlaced(cell));
    const single = selected.length === 1 ? selected[0] : undefined;
    // With the link tool every cell offers its ports; otherwise only the selection and the hovered cell.
    const portCells = new Set<PlacedCell>(showPorts ? Object.values(scene.cells).filter(isPlaced) : selected);
    const hovered = hover ? scene.cells[hover] : undefined;
    if (hovered && isPlaced(hovered)) {
      portCells.add(hovered);
    }
    // Pointer capture during a link drag suppresses hover, so the drop target shows its ports itself.
    const dropTarget = drag?.kind === 'link' && drag.target ? scene.cells[drag.target.cell] : undefined;
    if (dropTarget && isPlaced(dropTarget)) {
      portCells.add(dropTarget);
    }
    const marquee = drag?.kind === 'marquee' ? boundsFromPoints(drag.from, drag.to) : undefined;
    const create = drag?.kind === 'create' ? boundsFromPoints(drag.from, drag.to) : undefined;

    return (
      <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
        {selected.map((cell) => {
          const bounds = cellBounds(cell);
          return (
            <rect
              key={cell.id}
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              className='fill-none stroke-primary-500'
              strokeWidth={unit}
            />
          );
        })}
        {single && registry[single.kind].resizable && !single.locked && (
          <g>
            {HANDLES.map((handle) => {
              const point = handlePoint(cellBounds(single), handle);
              return (
                <rect
                  key={handle}
                  x={point.x - handleSize / 2}
                  y={point.y - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  className='fill-base-surface stroke-primary-500 pointer-events-auto'
                  strokeWidth={unit}
                  style={{ cursor: cursorFor(handle) }}
                  onPointerDown={(event) => onHandlePointerDown?.(single, handle, event)}
                />
              );
            })}
          </g>
        )}
        {[...portCells].map((cell) => {
          const bounds = cellBounds(cell);
          return registry[cell.kind].ports(cell).map((port) => {
            const point = portPoint(bounds, port);
            const active =
              drag?.kind === 'link' &&
              ((drag.source.cell === cell.id && drag.source.port === port.id) ||
                (drag.target?.cell === cell.id && drag.target.port === port.id));
            return (
              <circle
                key={`${cell.id}/${port.id}`}
                cx={point.x}
                cy={point.y}
                r={portRadius}
                className={mx(
                  'stroke-primary-500 pointer-events-auto cursor-crosshair',
                  active ? 'fill-primary-500' : 'fill-base-surface',
                )}
                strokeWidth={unit}
                onPointerDown={(event) => onPortPointerDown?.(cell, port, event)}
              />
            );
          });
        })}
        {drag?.kind === 'link' && (
          <path
            d={curvePath({ point: drag.from, side: 'e' }, { point: drag.to, side: 'w' })}
            className='fill-none stroke-primary-500'
            strokeWidth={2 * unit}
            strokeDasharray={`${6 * unit} ${4 * unit}`}
          />
        )}
        {marquee && (
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.width}
            height={marquee.height}
            className='fill-primary-500/10 stroke-primary-500'
            strokeWidth={unit}
          />
        )}
        {create && (
          <rect
            x={create.x}
            y={create.y}
            width={create.width}
            height={create.height}
            className='fill-none stroke-primary-500'
            strokeWidth={unit}
            strokeDasharray={`${6 * unit} ${4 * unit}`}
          />
        )}
      </svg>
    );
  },
);

ControlFrame.displayName = 'ControlFrame';
