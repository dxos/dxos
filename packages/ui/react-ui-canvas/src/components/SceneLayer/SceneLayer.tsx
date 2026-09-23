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

import { type NodeRegistry, type NodeViewProps } from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import { type ElementId, type Link, type Node, type NodeId, type Scene } from '../../model/types.ts';
import { portalFrame, portalScale, portalTransform } from '../../utils/camera.ts';
import { sceneBounds } from '../../utils/hit.ts';
import { sortByZ } from '../../utils/order.ts';
import { type PartEditing, type PartKey } from '../../utils/parts.ts';
import { type LinkGeometry, linkGeometry } from '../../utils/route.ts';
import { nodeBounds } from '../../utils/shapes.ts';
import { frameClasses } from '../../utils/style.ts';
import { TextPart } from '../PartEditor/PartEditor.tsx';

/** Screen px below which a portal is a solid tile; above `PREVIEW_PX` it mounts the child scene live. */
export const DOT_PX = 40;
export const PREVIEW_PX = 260;
/** Default for `liveDepth`: root plus this many live nested levels (decision 10). */
export const MAX_LIVE_DEPTH = 1;
/** Hysteresis at the tier boundaries so a portal does not flicker while zooming across one. */
const TIER_HYSTERESIS = 0.1;

export type Tier = 'dot' | 'preview' | 'live';

export const tierFor = (node: Node, zoom: number, depth: number, liveDepth: number, previous?: Tier): Tier => {
  const { width, height } = nodeBounds(node);
  const px = Math.min(width, height) * zoom;
  const dot = previous === 'dot' ? DOT_PX * (1 + TIER_HYSTERESIS) : DOT_PX * (1 - TIER_HYSTERESIS);
  const preview = previous === 'preview' ? PREVIEW_PX * (1 + TIER_HYSTERESIS) : PREVIEW_PX * (1 - TIER_HYSTERESIS);
  if (px < dot) {
    return 'dot';
  }
  if (px < preview || depth >= liveDepth) {
    return 'preview';
  }
  return 'live';
};

export type ElementHandlers = {
  onNodePointerDown?: (node: Node, event: React.PointerEvent) => void;
  onLinkPointerDown?: (link: Link, event: React.PointerEvent) => void;
  onLinkDoubleClick?: (link: Link, event: React.MouseEvent) => void;
  onLinkContextMenu?: (link: Link, event: React.MouseEvent) => void;
  /** The in-place editor of `part` finished with `text` (commit) or was dismissed (cancel). */
  onPartCommit?: (node: Node, part: PartKey, text: string) => void;
  onPartCancel?: () => void;
};

export type SceneLayerProps = {
  store: SceneStore;
  scene: Scene;
  registry: NodeRegistry;
  /** Effective screen zoom of this layer (camera zoom × portal scales). */
  zoom: number;
  depth: number;
  liveDepth: number;
  selected?: ReadonlySet<ElementId>;
  /** The portal a drill-in is animating into, while it is. */
  opening?: ElementId;
  /** The text part being edited in place, if any. */
  editing?: { id: NodeId; part: PartKey };
  /** Absent on nested (read-only) layers. */
  handlers?: ElementHandlers;
};

export const SceneLayer = memo(
  ({ store, scene, registry, zoom, depth, liveDepth, selected, opening, editing, handlers }: SceneLayerProps) => {
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
                  onContextMenu={(event) => handlers.onLinkContextMenu?.(link, event)}
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
            liveDepth={liveDepth}
            selected={selected?.has(node.id) ?? false}
            opening={opening === node.id}
            editingPart={editing?.id === node.id ? editing.part : undefined}
            handlers={handlers}
          />
        ))}
      </>
    );
  },
);

SceneLayer.displayName = 'SceneLayer';

type NodeFrameProps = Omit<NodeViewProps, 'editing'> & { editingPart?: PartKey; handlers?: ElementHandlers };

/** Positions a node, owns its frame styling and pointer events; the node definition renders the body. */
const NodeFrame = memo(({ handlers, editingPart, ...props }: NodeFrameProps) => {
  const { node, registry, selected } = props;
  const bounds = nodeBounds(node);
  const interactive = handlers !== undefined;
  const Component = registry[node.type].component;
  const editing = useMemo<PartEditing | undefined>(
    () =>
      editingPart && handlers
        ? {
            part: editingPart,
            commit: (text) => handlers.onPartCommit?.(node, editingPart, text),
            cancel: () => handlers.onPartCancel?.(),
          }
        : undefined,
    [editingPart, handlers, node],
  );
  return (
    <div
      className={mx(
        'absolute box-border border-2 overflow-hidden',
        ...frameClasses(node, selected),
        interactive && !node.locked && 'cursor-grab',
      )}
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      data-node-id={node.id}
      onPointerDown={interactive ? (event) => handlers.onNodePointerDown?.(node, event) : undefined}
    >
      <Component {...props} editing={editing} />
    </div>
  );
});

NodeFrame.displayName = 'NodeFrame';

const LabelNodeView = ({ node, editing }: NodeViewProps) => {
  const label = node.type === 'rect' || node.type === 'ellipse' ? (node.label ?? '') : '';
  return (
    <TextPart
      part='label'
      text={label}
      editing={editing}
      classNames='dx-fullscreen flex items-center justify-center text-lg text-center'
    >
      {label}
    </TextPart>
  );
};

export const RectNodeView = LabelNodeView;

export const EllipseNodeView = LabelNodeView;

export const ClassNodeView = ({ node, editing }: NodeViewProps) => {
  if (node.type !== 'class') {
    return null;
  }
  return (
    <div className='dx-fullscreen flex flex-col text-sm font-mono divide-y divide-separator'>
      <TextPart part='name' text={node.name} editing={editing} classNames='px-2 py-1 text-center font-bold'>
        {node.name}
      </TextPart>
      <TextPart
        part='attributes'
        text={node.attributes.join('\n')}
        editing={editing}
        classNames='px-2 py-1 flex-1 min-h-4'
      >
        {node.attributes.map((attribute, index) => (
          <div key={index}>{attribute}</div>
        ))}
      </TextPart>
      <TextPart part='methods' text={node.methods.join('\n')} editing={editing} classNames='px-2 py-1 flex-1 min-h-4'>
        {node.methods.map((method, index) => (
          <div key={index}>{method}</div>
        ))}
      </TextPart>
    </div>
  );
};

export const TextNodeView = ({ node, editing }: NodeViewProps) => {
  const text = node.type === 'text' ? node.text : '';
  return (
    <TextPart part='text' text={text} editing={editing} classNames='dx-fullscreen p-3 text-description'>
      {text}
    </TextPart>
  );
};

export const PortalNodeView = ({ node, store, registry, zoom, depth, liveDepth, opening }: NodeViewProps) => {
  const child = useAtomValue(store.scene(node.type === 'scene' ? node.scene : ''));
  // Being entered, the portal is already the child scene on the canvas: live, and without the tile tint.
  const tier = !child ? 'dot' : opening ? 'live' : tierFor(node, zoom, depth, liveDepth);
  const bounds = useMemo(() => (child ? portalFrame(node, sceneBounds(child)) : undefined), [node, child]);
  return (
    <div className={mx('dx-fullscreen', !opening && 'bg-hover-surface', tier === 'dot' && 'bg-primary-500/40')}>
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
              liveDepth={liveDepth}
            />
          </div>
        )}
      {!opening && (
        <span className='absolute top-1 left-2 text-xs text-subdued pointer-events-none'>
          {child?.name ?? child?.id}
        </span>
      )}
    </div>
  );
};
