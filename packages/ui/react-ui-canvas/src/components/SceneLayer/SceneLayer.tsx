//
// Copyright 2026 DXOS.org
//

//
// Renders one scene's nodes and links in scene coordinates under the camera transform (§7). Nodes are
// HTML so they can host live content; links are one SVG per scene; live portals nest another layer.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { memo, useId, useMemo } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { mx } from '@dxos/ui-theme';

import { nodeDef } from '../../model/node-def.ts';
import { type NodeRegistry, type NodeViewProps } from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type ElementId,
  type Link,
  type Marker,
  type Node,
  type NodeId,
  type Scene,
  isBoxNode,
  isEllipseNode,
  isNoteNode,
  isPortalNode,
  linkMarkers,
  showsContents,
} from '../../model/types.ts';
import { portalFrame, portalScale, portalTransform } from '../../utils/camera.ts';
import { contentBounds } from '../../utils/hit.ts';
import { type LatticeSpec } from '../../utils/lattice.ts';
import { sortByZ } from '../../utils/order.ts';
import { type PartEditing, type PartKey, isMultiline, nodeParts } from '../../utils/parts.ts';
import { sceneLinkGeometry } from '../../utils/route.ts';
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
  /** A node's own open control was pressed (a portal's zoom-in icon). */
  onNodeOpen?: (node: Node) => void;
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
  /** The scene's lattice, when it has one: smart links route through its gutters. */
  lattice?: LatticeSpec;
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
    lattice,
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
      () => sceneLinkGeometry(scene, registry, sortByZ(Object.values(scene.links)), lattice),
      [scene, registry, lattice],
    );
    const unit = 1 / Math.max(zoom, 0.05);
    // One set of end markers per layer, sized in scene units so they scale with the nodes they join.
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
                strokeWidth={LINK_WIDTH * unit}
                data-link-id={link.id}
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
        {/* The ends paint over the nodes, so an end centred on a node's edge shows whole. */}
        <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
          {links.map(({ link, path }) => (
            <path
              key={link.id}
              d={path}
              className='fill-none stroke-none'
              markerStart={markerUrl(linkMarkers(link).start, 'start')}
              markerEnd={markerUrl(linkMarkers(link).end, 'end')}
            />
          ))}
        </svg>
      </>
    );
  },
);

SceneLayer.displayName = 'SceneLayer';

/** A link's stroke, in screen px. */
const LINK_WIDTH = 2;

/** Bounding box of every end, in scene units. */
const END_BOX = 32;

/** The end markers, one per kind and end: a start marker points back along the path, an end marker along it. */
const Markers = ({ id, unit }: { id: string; unit: number }) => {
  // Each end fills a 32×32 box in scene units, so it scales with the shapes it joins: the arrow all 10 of its
  // 10 view units, the triangle 10 of its 12, the circle 8 of its 10.
  const arrow = END_BOX;
  const triangle = (END_BOX * 12) / 10;
  const circle = (END_BOX * 10) / 8;
  // An outline matches the line's on-screen width (`unit` is one screen px in scene units), in its marker's view units.
  const outline = (size: number, view: number) => (LINK_WIDTH * unit * view) / size;
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
      {/* Inheritance (UML generalization): a triangle filled with the canvas, so the line stops at its base. */}
      {ends.map((end) => (
        <marker
          key={`triangle-${end}`}
          id={`${id}-triangle-${end}`}
          viewBox='-1 -1 12 12'
          refX={10}
          refY={5}
          markerWidth={triangle}
          markerHeight={triangle}
          markerUnits='userSpaceOnUse'
          orient={end === 'start' ? 'auto-start-reverse' : 'auto'}
        >
          <path
            d='M 0 0 L 10 5 L 0 10 z'
            className='fill-base-surface stroke-neutral-500'
            strokeWidth={outline(triangle, 12)}
          />
        </marker>
      ))}
      {/* A circle centred on the connection point, filled with the canvas so the line stops at its rim. */}
      {ends.map((end) => (
        <marker
          key={`circle-${end}`}
          id={`${id}-circle-${end}`}
          viewBox='0 0 10 10'
          refX={5}
          refY={5}
          markerWidth={circle}
          markerHeight={circle}
          markerUnits='userSpaceOnUse'
        >
          <circle
            cx={5}
            cy={5}
            r={4}
            className='fill-base-surface stroke-neutral-500'
            strokeWidth={outline(circle, 10)}
          />
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
            multiline: nodeParts(registry, node).some((part) => part.field === editingPart && isMultiline(part)),
            commit: (text) => handlers.onPartCommit?.(node, editingPart, text),
            cancel: () => handlers.onPartCancel?.(),
          }
        : undefined,
    [editingPart, handlers, node, registry],
  );
  const onOpen = useMemo(
    () => (interactive && handlers.onNodeOpen ? () => handlers.onNodeOpen?.(node) : undefined),
    [interactive, handlers, node],
  );
  return (
    <div
      className={mx(
        'absolute box-border border-4 overflow-hidden',
        // Being zoomed into, the frame becomes the child scene's canvas, so it drops its fill (the first class)
        // at once and keeps only its own border, not the selection's or the hover's.
        ...(props.opening ? frameClasses(node, false).slice(1) : frameClasses(node, selected, hovered)),
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
      <Component {...props} editing={editing} onOpen={onOpen} />
      {debug && (
        <div
          className='absolute top-0 left-0 px-1 text-[10px] leading-4 font-mono whitespace-nowrap bg-modal-surface text-fg-muted pointer-events-none'
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

type LabelPartProps = Pick<NodeViewProps, 'node' | 'editing'> & { label: string };

/** The centred, editable label of a box (and an ellipse). */
const LabelPart = ({ node, editing, label }: LabelPartProps) => (
  <TextPart
    part='label'
    text={label}
    editing={editing}
    classNames={mx(
      'dx-cover flex items-center justify-center text-center whitespace-pre-wrap',
      sizeClass(node, 'text-2xl'),
    )}
  >
    {label}
  </TextPart>
);

const LabelNodeView = ({ node, editing }: NodeViewProps) => (
  <LabelPart node={node} editing={editing} label={isBoxNode(node) || isEllipseNode(node) ? (node.label ?? '') : ''} />
);

/** The `box` prototype's body: its centred label. */
export const BoxNodeView = LabelNodeView;

export const EllipseNodeView = LabelNodeView;

/** A node whose type the registry does not know: its frame and type name, so the scene still reads. */
export const UnknownNodeView = ({ node }: NodeViewProps) => (
  <div className='dx-cover flex items-center justify-center text-xs text-fg-muted'>{node.type}</div>
);

export const NoteNodeView = ({ node, editing }: NodeViewProps) => {
  const text = isNoteNode(node) ? node.text : '';
  return (
    <TextPart part='text' text={text} editing={editing} classNames='dx-cover p-3 whitespace-pre-wrap'>
      {text}
    </TextPart>
  );
};

/**
 * A box over a child scene: the centred label, or with `contents` the child drawn inside the frame (a
 * preview, then the live scene as it grows on screen), and a zoom-in control at the top-right.
 */
export const PortalNodeView = (props: NodeViewProps) => {
  const { node, store, registry, zoom, depth, liveDepth, opening, editing, onOpen } = props;
  const child = useAtomValue(store.scene(isPortalNode(node) ? node.scene : ''));
  const contents = opening || (isPortalNode(node) && showsContents(node));
  // Being entered, the portal is already the child scene on the canvas: live, and without the tile tint.
  const tier = !child ? 'dot' : opening ? 'live' : tierFor(node, zoom, depth, liveDepth);
  const bounds = useMemo(() => (child ? portalFrame(node, contentBounds(child)) : undefined), [node, child]);
  const title = (isPortalNode(node) ? node.label : undefined) ?? child?.name ?? child?.id ?? '';
  if (!contents) {
    return (
      <>
        <LabelPart node={node} editing={editing} label={title} />
        {onOpen && <OpenControl onOpen={onOpen} />}
      </>
    );
  }
  return (
    <div className={mx('dx-cover', tier === 'dot' && 'bg-primary-500/40')}>
      {tier === 'preview' && child && (
        <div className='dx-cover flex flex-col items-center justify-center gap-1 pointer-events-none'>
          <span className='text-2xl'>{title}</span>
          <span>
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
      {/* The preview centres the title already; the live scene fills the frame, so it names it in the corner. */}
      {!opening && tier === 'live' && (
        <span className='absolute top-1 left-2 text-xs text-fg-subtle pointer-events-none'>{title}</span>
      )}
      {!opening && onOpen && <OpenControl onOpen={onOpen} />}
    </div>
  );
};

/** The zoom-in control at a portal's top-right; it takes the press, so it neither drags nor selects the node. */
const OpenControl = ({ onOpen }: { onOpen: () => void }) => (
  <Button.Root
    variant='ghost'
    iconOnly
    icon='ph--arrows-out--regular'
    label='Open scene'
    classNames='absolute top-1 right-1'
    data-testid='portal-open'
    onPointerDown={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      onOpen();
    }}
  />
);
