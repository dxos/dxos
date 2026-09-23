//
// Copyright 2026 DXOS.org
//

//
// Renders one scene's nodes and links in scene coordinates under the camera transform (§7). Nodes are
// HTML so they can host live content; links are one SVG per scene; live portals nest another layer.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { memo, useId, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';

import { type NodeRegistry, type NodeViewProps, nodeDef } from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type ElementId,
  type Link,
  type Marker,
  type Node,
  type NodeId,
  type Scene,
  isClassNode,
  isEllipseNode,
  isNoteNode,
  isPortalNode,
  isRectNode,
  linkMarkers,
} from '../../model/types.ts';
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
  hover?: NodeId;
  /** The portal a drill-in is animating into, while it is. */
  opening?: ElementId;
  /** The text part being edited in place, if any. */
  editing?: { id: NodeId; part: PartKey };
  /** A node drawn as a preview of what a gesture will create: translucent, dashed, and not pressable. */
  ghost?: NodeId;
  /** Frames show their id, type and geometry. */
  debug?: boolean;
  /** Absent on nested (read-only) layers. */
  handlers?: ElementHandlers;
};

export const SceneLayer = memo(
  ({
    store,
    scene,
    registry,
    zoom,
    depth,
    liveDepth,
    selected,
    hover,
    opening,
    editing,
    ghost,
    debug,
    handlers,
  }: SceneLayerProps) => {
    // Paint order is z, with the selection on top of it: a selected node is being worked on and must not
    // hide under a neighbour, while the model's z stays what the user arranged.
    const nodes = useMemo(() => {
      const sorted = sortByZ(Object.values(scene.nodes));
      return selected?.size
        ? [...sorted.filter((node) => !selected.has(node.id)), ...sorted.filter((node) => selected.has(node.id))]
        : sorted;
    }, [scene.nodes, selected]);
    const links = useMemo(
      () =>
        sortByZ(Object.values(scene.links))
          .map((link) => linkGeometry(scene, registry, link))
          .filter((geometry): geometry is LinkGeometry => geometry !== undefined),
      [scene, registry],
    );
    const unit = 1 / Math.max(zoom, 0.05);
    // One set of end markers per layer, sized in scene units so they scale with the stroke.
    const markerId = useId();
    const markerUrl = (marker: Marker | undefined, end: 'start' | 'end') =>
      marker ? `url(#${markerId}-${marker}-${end})` : undefined;

    return (
      <>
        <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
          <defs>
            <Markers id={markerId} unit={unit} />
          </defs>
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
                data-link-id={link.id}
                markerStart={markerUrl(linkMarkers(link).start, 'start')}
                markerEnd={markerUrl(linkMarkers(link).end, 'end')}
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
            hovered={hover === node.id}
            opening={opening === node.id}
            editingPart={editing?.id === node.id ? editing.part : undefined}
            ghost={ghost === node.id}
            debug={debug}
            handlers={handlers}
          />
        ))}
      </>
    );
  },
);

SceneLayer.displayName = 'SceneLayer';

/** The end markers, one per kind and end: a start marker points back along the path, an end marker along it. */
const Markers = ({ id, unit }: { id: string; unit: number }) => {
  const size = 6 * unit;
  // An arrowhead has to read as a direction at a glance, so it carries twice the weight of an end dot.
  const arrow = 2 * size;
  const ends = ['start', 'end'] as const;
  return (
    <>
      {ends.map((end) => (
        <marker
          key={`arrow-${end}`}
          id={`${id}-arrow-${end}`}
          viewBox='0 0 10 10'
          refX={9}
          refY={5}
          markerWidth={arrow}
          markerHeight={arrow}
          markerUnits='userSpaceOnUse'
          orient={end === 'start' ? 'auto-start-reverse' : 'auto'}
        >
          <path d='M 0 0 L 10 5 L 0 10 z' className='fill-neutral-500' />
        </marker>
      ))}
      {ends.map((end) => (
        <marker
          key={`circle-${end}`}
          id={`${id}-circle-${end}`}
          viewBox='0 0 10 10'
          refX={5}
          refY={5}
          markerWidth={size}
          markerHeight={size}
          markerUnits='userSpaceOnUse'
        >
          <circle cx={5} cy={5} r={4} className='fill-neutral-500' />
        </marker>
      ))}
    </>
  );
};

type NodeFrameProps = Omit<NodeViewProps, 'editing'> & {
  hovered?: boolean;
  editingPart?: PartKey;
  ghost?: boolean;
  debug?: boolean;
  handlers?: ElementHandlers;
};

/** Positions a node, owns its frame styling and pointer events; the node definition renders the body. */
const NodeFrame = memo(({ handlers, hovered, editingPart, ghost, debug, ...props }: NodeFrameProps) => {
  const { node, registry, selected } = props;
  const bounds = nodeBounds(node);
  const interactive = handlers !== undefined && !ghost;
  const Component = nodeDef(registry, node)?.component ?? UnknownNodeView;
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
        'absolute box-border border-4 overflow-hidden',
        ...frameClasses(node, selected, hovered),
        interactive && !node.locked && 'cursor-grab',
        ghost && 'opacity-50 border-dashed pointer-events-none',
      )}
      // `fontSize` is inherited by every text part, so an override set on the node reaches the label,
      // the class compartments and the editor alike; unset, the parts keep their own theme sizes.
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        fontSize: node.style?.fontSize,
      }}
      data-node-id={node.id}
      data-ghost={ghost || undefined}
      onPointerDown={interactive ? (event) => handlers.onNodePointerDown?.(node, event) : undefined}
    >
      <Component {...props} editing={editing} />
      {debug && (
        <div
          className='absolute top-0 left-0 px-1 text-[10px] leading-4 font-mono whitespace-nowrap bg-modal-surface text-description pointer-events-none'
          data-testid='node-debug'
        >
          {node.id} · {node.type} · {bounds.x},{bounds.y} {bounds.width}×{bounds.height} · z {node.z}
        </div>
      )}
    </div>
  );
});

NodeFrame.displayName = 'NodeFrame';

/**
 * A part's own size class, or nothing when the node overrides `fontSize`: a Tailwind size wins over the
 * inherited value, so the override only reaches the text if the class is left off.
 */
const sizeClass = (node: Node, className: string) => (node.style?.fontSize === undefined ? className : undefined);

const LabelNodeView = ({ node, editing }: NodeViewProps) => {
  const label = isRectNode(node) || isEllipseNode(node) ? (node.label ?? '') : '';
  return (
    <TextPart
      part='label'
      text={label}
      editing={editing}
      classNames={mx('dx-fullscreen flex items-center justify-center text-center', sizeClass(node, 'text-2xl'))}
    >
      {label}
    </TextPart>
  );
};

export const RectNodeView = LabelNodeView;

export const EllipseNodeView = LabelNodeView;

export const ClassNodeView = ({ node, editing }: NodeViewProps) => {
  if (!isClassNode(node)) {
    return null;
  }
  return (
    <div className={mx('dx-fullscreen flex flex-col font-mono divide-y divide-separator', sizeClass(node, 'text-sm'))}>
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

/** A node whose type the registry does not know: its frame and type name, so the scene still reads. */
export const UnknownNodeView = ({ node }: NodeViewProps) => (
  <div className='dx-fullscreen flex items-center justify-center text-xs text-description'>{node.type}</div>
);

export const NoteNodeView = ({ node, editing }: NodeViewProps) => {
  const text = isNoteNode(node) ? node.text : '';
  return (
    <TextPart part='text' text={text} editing={editing} classNames='dx-fullscreen p-3'>
      {text}
    </TextPart>
  );
};

export const PortalNodeView = ({ node, store, registry, zoom, depth, liveDepth, opening }: NodeViewProps) => {
  const child = useAtomValue(store.scene(isPortalNode(node) ? node.scene : ''));
  // Being entered, the portal is already the child scene on the canvas: live, and without the tile tint.
  const tier = !child ? 'dot' : opening ? 'live' : tierFor(node, zoom, depth, liveDepth);
  const bounds = useMemo(() => (child ? portalFrame(node, sceneBounds(child)) : undefined), [node, child]);
  return (
    <div className={mx('dx-fullscreen', tier === 'dot' && 'bg-primary-500/40')}>
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
          // Pulled out by the frame's border, so the child's origin is the node's corner as
          // `portalTransform` and `enterPortal` assume; inside the padding box it sat a border in and
          // the scene jumped by that at the drill-in swap.
          <div
            className='absolute -top-1 -left-1 pointer-events-none'
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
