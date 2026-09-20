//
// Copyright 2026 DXOS.org
//

//
// Renders one scene's nodes and links in scene coordinates under the camera transform (§7). Nodes are
// HTML so they can host live content; links are one SVG per scene; live portals nest another layer.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { memo, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';

import { portalScale, portalTransform } from './camera.ts';
import { sceneBounds } from './hit.ts';
import { sortByZ } from './order.ts';
import { pairPorts, portPoint } from './ports.ts';
import { type NodeRegistry, type NodeViewProps, nodePorts } from './registry.ts';
import { type RouteEnd, linkPath } from './route.ts';
import { nodeBounds } from './shapes.ts';
import { type SceneStore } from './store.ts';
import { type ElementId, type Link, type Node, type Scene } from './types.ts';

/** Screen px below which a portal is a solid tile; above `PREVIEW_PX` it mounts the child scene live. */
export const DOT_PX = 40;
export const PREVIEW_PX = 260;
/** Root plus this many live nested levels (decision 10). */
export const MAX_LIVE_DEPTH = 1;
/** Hysteresis at the tier boundaries so a portal does not flicker while zooming across one. */
const TIER_HYSTERESIS = 0.1;

export type Tier = 'dot' | 'preview' | 'live';

export const tierFor = (node: Node, zoom: number, depth: number, previous?: Tier): Tier => {
  const { width, height } = nodeBounds(node);
  const px = Math.min(width, height) * zoom;
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

export type LinkGeometry = { link: Link; path: string; source: RouteEnd; target: RouteEnd };

/** Resolve a link's ends to ports (automatic pairing unless pinned) and route it by its type. */
export const linkGeometry = (scene: Scene, registry: NodeRegistry, link: Link): LinkGeometry | undefined => {
  const source = scene.nodes[link.source.node];
  const target = scene.nodes[link.target.node];
  if (!source || !target) {
    return undefined;
  }
  const sourceBounds = nodeBounds(source);
  const targetBounds = nodeBounds(target);
  const pair = pairPorts(
    { bounds: sourceBounds, ports: nodePorts(registry, source), port: link.source.port },
    { bounds: targetBounds, ports: nodePorts(registry, target), port: link.target.port },
  );
  if (!pair) {
    return undefined;
  }
  const from = { point: portPoint(sourceBounds, pair.source), side: pair.source.side };
  const to = { point: portPoint(targetBounds, pair.target), side: pair.target.side };
  return { link, path: linkPath(link, from, to), source: from, target: to };
};

export type ElementHandlers = {
  onNodePointerDown?: (node: Node, event: React.PointerEvent) => void;
  onLinkPointerDown?: (link: Link, event: React.PointerEvent) => void;
  onLinkDoubleClick?: (link: Link, event: React.MouseEvent) => void;
};

export type SceneLayerProps = {
  store: SceneStore;
  scene: Scene;
  registry: NodeRegistry;
  /** Effective screen zoom of this layer (camera zoom × portal scales). */
  zoom: number;
  depth: number;
  selected?: ReadonlySet<ElementId>;
  /** Absent on nested (read-only) layers. */
  handlers?: ElementHandlers;
};

export const SceneLayer = memo(({ store, scene, registry, zoom, depth, selected, handlers }: SceneLayerProps) => {
  const nodes = useMemo(() => sortByZ(Object.values(scene.nodes)), [scene.nodes]);
  const links = useMemo(
    () =>
      sortByZ(Object.values(scene.links))
        .map((link) => linkGeometry(scene, registry, link))
        .filter((geometry): geometry is LinkGeometry => geometry !== undefined),
    [scene, registry],
  );
  const unit = 1 / Math.max(zoom, 0.05);

  return (
    <>
      <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
        {links.map(({ link, path }) => (
          <g key={link.id}>
            {/* A wide transparent twin makes the thin stroke easy to press. */}
            {handlers && (
              <path
                d={path}
                className='fill-none stroke-transparent pointer-events-auto cursor-pointer'
                style={{ pointerEvents: 'stroke' }}
                strokeWidth={12 * unit}
                onPointerDown={(event) => handlers.onLinkPointerDown?.(link, event)}
                onDoubleClick={(event) => handlers.onLinkDoubleClick?.(link, event)}
              />
            )}
            <path
              d={path}
              className={mx('fill-none', selected?.has(link.id) ? 'stroke-primary-500' : 'stroke-neutral-500')}
              strokeWidth={2 * unit}
            />
          </g>
        ))}
      </svg>
      {nodes.map((node) => (
        <NodeFrame
          key={node.id}
          store={store}
          scene={scene}
          registry={registry}
          node={node}
          zoom={zoom}
          depth={depth}
          selected={selected?.has(node.id) ?? false}
          handlers={handlers}
        />
      ))}
    </>
  );
});

SceneLayer.displayName = 'SceneLayer';

type NodeFrameProps = NodeViewProps & { handlers?: ElementHandlers };

/** Positions a node, owns its frame styling and pointer events; the node definition renders the body. */
const NodeFrame = memo(({ handlers, ...props }: NodeFrameProps) => {
  const { node, registry, selected } = props;
  const bounds = nodeBounds(node);
  const interactive = handlers !== undefined;
  const Component = registry[node.type].component;
  return (
    <div
      className={mx(
        'absolute box-border border-2 overflow-hidden',
        node.type === 'ellipse' ? 'rounded-[50%]' : 'rounded-sm',
        selected ? 'border-primary-500' : 'border-separator',
        interactive && !node.locked && 'cursor-grab',
      )}
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      data-node-id={node.id}
      onPointerDown={interactive ? (event) => handlers.onNodePointerDown?.(node, event) : undefined}
    >
      <Component {...props} />
    </div>
  );
});

NodeFrame.displayName = 'NodeFrame';

export const RectNodeView = ({ node }: NodeViewProps) => (
  <div className='dx-fullscreen flex items-center justify-center bg-base-surface'>
    <span className='text-lg'>{node.type === 'rect' ? node.label : undefined}</span>
  </div>
);

export const EllipseNodeView = ({ node }: NodeViewProps) => (
  <div className='dx-fullscreen flex items-center justify-center bg-base-surface'>
    <span className='text-lg'>{node.type === 'ellipse' ? node.label : undefined}</span>
  </div>
);

export const ClassNodeView = ({ node }: NodeViewProps) => {
  if (node.type !== 'class') {
    return null;
  }
  return (
    <div className='dx-fullscreen flex flex-col bg-base-surface text-sm font-mono divide-y divide-separator'>
      <div className='px-2 py-1 text-center font-bold'>{node.name}</div>
      <div className='px-2 py-1 flex-1 min-h-4'>
        {node.attributes.map((attribute, index) => (
          <div key={index}>{attribute}</div>
        ))}
      </div>
      <div className='px-2 py-1 flex-1 min-h-4'>
        {node.methods.map((method, index) => (
          <div key={index}>{method}</div>
        ))}
      </div>
    </div>
  );
};

export const TextNodeView = ({ node }: NodeViewProps) => (
  <div className='dx-fullscreen p-3 bg-input-surface text-description'>
    {node.type === 'text' ? node.text : undefined}
  </div>
);

export const PortalNodeView = ({ node, store, registry, zoom, depth }: NodeViewProps) => {
  const child = useAtomValue(store.scene(node.type === 'scene' ? node.scene : ''));
  const tier = child ? tierFor(node, zoom, depth) : 'dot';
  const bounds = useMemo(() => (child ? sceneBounds(child) : undefined), [child]);
  return (
    <div className={mx('dx-fullscreen bg-hover-surface', tier === 'dot' && 'bg-primary-500/40')}>
      {tier === 'preview' && child && (
        <div className='dx-fullscreen flex flex-col items-center justify-center gap-1 pointer-events-none'>
          <span className='text-2xl'>{child.name ?? child.id}</span>
          <span className='text-description'>
            {Object.keys(child.nodes).length} nodes · {Object.keys(child.links).length} links
          </span>
        </div>
      )}
      {tier === 'live' &&
        child &&
        bounds && (
          // The nested layer is read-only: only the root scene receives handlers.
          <div
            className='absolute pointer-events-none'
            style={{ transform: portalTransform(node, bounds), transformOrigin: '0 0' }}
          >
            <SceneLayer
              store={store}
              scene={child}
              registry={registry}
              zoom={zoom * portalScale(node, bounds)}
              depth={depth + 1}
            />
          </div>
        )}
      <span className='absolute top-1 left-2 text-xs text-subdued pointer-events-none'>{child?.name ?? child?.id}</span>
    </div>
  );
};
