//
// Copyright 2026 DXOS.org
//

//
// Renders one scene's cells and links in scene coordinates under the camera transform (§7). Cells are
// HTML so they can host live content; links are one SVG per scene; live portals nest another layer.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { memo, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';

import { cellBounds, portalScale, portalTransform } from './camera.ts';
import { sceneBounds } from './hit.ts';
import { sortByZ } from './order.ts';
import { pairPorts, portPoint } from './ports.ts';
import { type CellRegistry, type CellViewProps } from './registry.ts';
import { type RouteEnd, curvePath } from './route.ts';
import { type SceneStore } from './store.ts';
import { type CellId, type LinkCell, type PlacedCell, type Scene, isLink, isPlaced } from './types.ts';

/** Screen px below which a portal is a solid tile; above `PREVIEW_PX` it mounts the child scene live. */
export const DOT_PX = 40;
export const PREVIEW_PX = 260;
/** Root plus this many live nested levels (decision 10). */
export const MAX_LIVE_DEPTH = 1;
/** Hysteresis at the tier boundaries so a portal does not flicker while zooming across one. */
const TIER_HYSTERESIS = 0.1;

export type Tier = 'dot' | 'preview' | 'live';

export const tierFor = (cell: PlacedCell, zoom: number, depth: number, previous?: Tier): Tier => {
  const px = Math.min(cell.size.width, cell.size.height) * zoom;
  const dot = previous === 'dot' ? DOT_PX * (1 + TIER_HYSTERESIS) : DOT_PX * (1 - TIER_HYSTERESIS);
  const preview = previous === 'preview' ? PREVIEW_PX * (1 + TIER_HYSTERESIS) : PREVIEW_PX * (1 - TIER_HYSTERESIS);
  if (px < dot) {
    return 'dot';
  }
  if (px < preview || depth >= MAX_LIVE_DEPTH) {
    return 'preview';
  }
  return 'live';
};

export type LinkGeometry = { link: LinkCell; path: string; source: RouteEnd; target: RouteEnd };

/** Resolve a link's ends to ports (automatic pairing unless pinned) and route it. */
export const linkGeometry = (scene: Scene, registry: CellRegistry, link: LinkCell): LinkGeometry | undefined => {
  const source = scene.cells[link.source.cell];
  const target = scene.cells[link.target.cell];
  if (!source || !target || !isPlaced(source) || !isPlaced(target)) {
    return undefined;
  }
  const sourceBounds = cellBounds(source);
  const targetBounds = cellBounds(target);
  const pair = pairPorts(
    { bounds: sourceBounds, ports: registry[source.kind].ports(source), port: link.source.port },
    { bounds: targetBounds, ports: registry[target.kind].ports(target), port: link.target.port },
  );
  if (!pair) {
    return undefined;
  }
  const from = { point: portPoint(sourceBounds, pair.source), side: pair.source.side };
  const to = { point: portPoint(targetBounds, pair.target), side: pair.target.side };
  return { link, path: curvePath(from, to), source: from, target: to };
};

export type CellHandlers = {
  onPointerDown?: (cell: PlacedCell, event: React.PointerEvent) => void;
};

export type SceneLayerProps = {
  store: SceneStore;
  scene: Scene;
  registry: CellRegistry;
  /** Effective screen zoom of this layer (camera zoom × portal scales). */
  zoom: number;
  depth: number;
  selected?: ReadonlySet<CellId>;
  /** Absent on nested (read-only) layers. */
  handlers?: CellHandlers;
};

export const SceneLayer = memo(({ store, scene, registry, zoom, depth, selected, handlers }: SceneLayerProps) => {
  const cells = useMemo(() => Object.values(scene.cells), [scene.cells]);
  const placed = useMemo(() => sortByZ(cells.filter(isPlaced)), [cells]);
  const links = useMemo(
    () =>
      cells
        .filter(isLink)
        .map((link) => linkGeometry(scene, registry, link))
        .filter((geometry): geometry is LinkGeometry => geometry !== undefined),
    [cells, scene, registry],
  );

  return (
    <>
      <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
        {links.map(({ link, path }) => (
          <path
            key={link.id}
            d={path}
            className={mx('fill-none', selected?.has(link.id) ? 'stroke-primary-500' : 'stroke-neutral-500')}
            strokeWidth={2 / Math.max(zoom, 0.05)}
          />
        ))}
      </svg>
      {placed.map((cell) => (
        <CellFrame
          key={cell.id}
          store={store}
          scene={scene}
          registry={registry}
          cell={cell}
          zoom={zoom}
          depth={depth}
          selected={selected?.has(cell.id) ?? false}
          handlers={handlers}
        />
      ))}
    </>
  );
});

SceneLayer.displayName = 'SceneLayer';

type CellFrameProps = CellViewProps & { handlers?: CellHandlers };

/** Positions a cell, owns its frame styling and pointer events; the cell definition renders the body. */
const CellFrame = memo(({ handlers, ...props }: CellFrameProps) => {
  const { cell, registry, selected } = props;
  const bounds = cellBounds(cell);
  const interactive = handlers !== undefined;
  const Component = registry[cell.kind].component;
  return (
    <div
      className={mx(
        'absolute box-border rounded-sm border-2 overflow-hidden',
        selected ? 'border-primary-500' : 'border-separator',
        interactive && !cell.locked && 'cursor-grab',
      )}
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      data-cell-id={cell.id}
      onPointerDown={interactive ? (event) => handlers.onPointerDown?.(cell, event) : undefined}
    >
      <Component {...props} />
    </div>
  );
});

CellFrame.displayName = 'CellFrame';

export const RectCellView = ({ cell }: CellViewProps) => (
  <div className='dx-fullscreen flex items-center justify-center bg-base-surface'>
    <span className='text-lg'>{cell.kind === 'rect' ? cell.label : undefined}</span>
  </div>
);

export const TextCellView = ({ cell }: CellViewProps) => (
  <div className='dx-fullscreen p-3 bg-input-surface text-description'>
    {cell.kind === 'text' ? cell.text : undefined}
  </div>
);

export const PortalCellView = ({ cell, store, registry, zoom, depth }: CellViewProps) => {
  const child = useAtomValue(store.scene(cell.kind === 'scene' ? cell.scene : ''));
  const tier = child ? tierFor(cell, zoom, depth) : 'dot';
  const bounds = useMemo(() => (child ? sceneBounds(child) : undefined), [child]);
  return (
    <div className={mx('dx-fullscreen bg-hover-surface', tier === 'dot' && 'bg-primary-500/40')}>
      {tier === 'preview' && child && (
        <div className='dx-fullscreen flex flex-col items-center justify-center gap-1 pointer-events-none'>
          <span className='text-2xl'>{child.name ?? child.id}</span>
          <span className='text-description'>{Object.keys(child.cells).length} cells</span>
        </div>
      )}
      {tier === 'live' &&
        child &&
        bounds && (
          // The nested layer is read-only: only the root scene receives handlers.
          <div
            className='absolute pointer-events-none'
            style={{ transform: portalTransform(cell, bounds), transformOrigin: '0 0' }}
          >
            <SceneLayer
              store={store}
              scene={child}
              registry={registry}
              zoom={zoom * portalScale(cell, bounds)}
              depth={depth + 1}
            />
          </div>
        )}
      <span className='absolute top-1 left-2 text-xs text-subdued pointer-events-none'>{child?.name ?? child?.id}</span>
    </div>
  );
};
