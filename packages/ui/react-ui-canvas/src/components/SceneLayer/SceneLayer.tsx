//
// Copyright 2026 DXOS.org
//

//
// Renders one scene's nodes and links in scene coordinates under the camera transform (§7). Nodes are
// HTML so they can host live content; links are one SVG per scene; live portals nest another layer.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, {
  type CSSProperties,
  Fragment,
  createContext,
  memo,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as Button from '@dxos/react-ui/Button';
import { mx } from '@dxos/ui-theme';

import { nodeDef } from '../../model/node-def.ts';
import { type NodeRegistry, type NodeViewProps } from '../../model/registry.ts';
import { NO_STYLES, type SceneStore } from '../../model/store.ts';
import {
  type ElementId,
  type LineStyle,
  type Link,
  type LinkId,
  MAJOR_GRID_RATIO,
  type Marker,
  type Node,
  type NodeId,
  type Scene,
  type StyleMap,
  isFrameNode,
  isNoteNode,
  linkMarkers,
  showsContents,
} from '../../model/types.ts';
import { portalFrame, portalScale, portalTransform } from '../../utils/camera.ts';
import { contentBounds } from '../../utils/hit.ts';
import { type LatticeSpec } from '../../utils/lattice.ts';
import { elementLayer, sceneLayers, visibleScene } from '../../utils/layers.ts';
import { sortByZ } from '../../utils/order.ts';
import { type PartEditing, type PartKey, isMultiline, nodeParts } from '../../utils/parts.ts';
import { sceneLinkGeometry } from '../../utils/route.ts';
import { DEFAULT_CELL, nodeBounds } from '../../utils/shapes.ts';
import { alignClasses, classedLink, classedNode, frameClasses, lineClasses } from '../../utils/style.ts';
import { TextPart } from '../PartEditor/PartEditor.tsx';

/** Screen px below which a portal shows only its title; above it a portal showing its contents mounts the child live. */
export const DOT_PX = 40;
/** Default for `liveDepth`: root plus this many live nested levels (decision 10). */
export const MAX_LIVE_DEPTH = 1;
/** Hysteresis at the tier boundaries so a portal does not flicker while zooming across one. */
const TIER_HYSTERESIS = 0.1;

export type Tier = 'dot' | 'preview' | 'live';

export const tierFor = (node: Node, zoom: number, depth: number, liveDepth: number, previous?: Tier): Tier => {
  const { width, height } = nodeBounds(node);
  const px = Math.min(width, height) * zoom;
  const dot = previous === 'dot' ? DOT_PX * (1 + TIER_HYSTERESIS) : DOT_PX * (1 - TIER_HYSTERESIS);
  if (px < dot) {
    return 'dot';
  }
  // Past `liveDepth` the child is summarised rather than mounted, which bounds how many scenes render live.
  return depth >= liveDepth ? 'preview' : 'live';
};

export type ElementHandlers = {
  onNodePointerDown?: (node: Node, event: React.PointerEvent) => void;
  onLinkPointerDown?: (link: Link, event: React.PointerEvent) => void;
  onLinkDoubleClick?: (link: Link, event: React.MouseEvent) => void;
  onLinkContextMenu?: (link: Link, event: React.MouseEvent) => void;
  /** The in-place editor of `part` finished with `text` (commit) or was dismissed (cancel). */
  onPartCommit?: (node: Node, part: PartKey, text: string) => void;
  onPartCancel?: () => void;
  /** The pointer entered a link (its id) or left it (`undefined`). */
  onLinkHover?: (id: LinkId | undefined) => void;
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
  /** The selection is drawn as it looks, without its outline (a move in flight shows the shapes themselves). */
  plain?: boolean;
  hover?: NodeId;
  /** The link under the pointer, outlined as a hovered shape is. */
  hoveredLink?: LinkId;
  /** The portal a drill-in is animating into, while it is. */
  opening?: ElementId;
  /** The portal filling most of the view, and the opacity of everything else on the layer as it does. */
  focus?: { id: ElementId; opacity: number };
  /** The text part being edited in place, if any. */
  editing?: { id: NodeId; part: PartKey };
  /** The node whose embedded content takes input. */
  active?: NodeId;
  /** A node drawn as a preview of what a gesture will create: translucent, dashed, and not pressable. */
  ghost?: NodeId;
  /** Frames show their id, type and geometry. */
  debug?: boolean;
  /** Absent on nested (read-only) layers. */
  handlers?: ElementHandlers;
  /** The scene's lattice, when it has one: smart links route through its gutters. */
  lattice?: LatticeSpec;
  /** Scene px of one nominal unit (the drawing's major grid cell); a nested layer inherits its parent's. */
  cell?: number;
};

export const SceneLayer = memo(
  ({
    store,
    scene: sceneProp,
    registry,
    zoom,
    depth,
    liveDepth,
    selected,
    plain,
    hover,
    hoveredLink,
    opening,
    focus,
    editing,
    active,
    ghost,
    debug,
    handlers,
    lattice: latticeProp,
    cell: cellProp,
  }: SceneLayerProps) => {
    const inherited = useContext(CellContext);
    const cell = cellProp ?? inherited;
    // A nested scene (a frame's contents, a drill-in in flight) routes on its parent's lattice, so its links do not
    // jump onto the gutters when it settles as the root.
    const inheritedLattice = useContext(LatticeContext);
    const lattice = latticeProp ?? inheritedLattice;
    // A hidden layer's elements are not drawn (nor, for the root, hit: the view hit-tests the same visible scene).
    const scene = useMemo(() => visibleScene(sceneProp), [sceneProp]);
    const links = useMemo(
      () => sceneLinkGeometry(scene, registry, sortByZ(Object.values(scene.links)), lattice),
      [scene, registry, lattice],
    );
    // Paint order is the layers', bottom first: each layer's links, then its nodes, then its links' ends, so an upper
    // layer covers a lower one whole. Within a layer it is z, with the selection on top: a selected node is being
    // worked on and must not hide under a neighbour, while the model's order stays what the user arranged.
    const groups = useMemo(() => {
      const layers = sceneLayers(scene);
      const nodes = sortByZ(Object.values(scene.nodes));
      return layers.map((layer) => {
        const onLayer = nodes.filter((node) => elementLayer(node, layers) === layer.id);
        return {
          layer,
          nodes: selected?.size
            ? [...onLayer.filter((node) => !selected.has(node.id)), ...onLayer.filter((node) => selected.has(node.id))]
            : onLayer,
          links: links.filter(({ link }) => elementLayer(link, layers) === layer.id),
        };
      });
    }, [scene, links, selected]);
    // Each element is drawn with its class's look under its own; the handlers still get the element as stored.
    const styles = useAtomValue(store.styles ?? NO_STYLES);
    const lines = useMemo(
      () => new Map(links.map(({ link }) => [link.id, classedLink(link, styles).style])),
      [links, styles],
    );
    const unit = 1 / Math.max(zoom, 0.05);
    const linkWidth = LINK_WIDTH * lineWeight(depth, zoom);
    // Everything but the portal being zoomed into fades with the zoom (see `layerOpacity`).
    const fadeStyle: CSSProperties | undefined = focus && focus.opacity < 1 ? { opacity: focus.opacity } : undefined;
    // One set of end markers per line colour in use, sized in scene units so they scale with the nodes they join.
    const markerId = useId();
    const lineHues = useMemo(() => [...new Set([...lines.values()].map((line) => line?.hue))], [lines]);
    const markerUrl = (marker: Marker | undefined, end: 'start' | 'end', hue: string | undefined) =>
      marker ? `url(#${markerId}-${hue ?? 'default'}-${marker}-${end})` : undefined;

    return (
      <CellContext.Provider value={cell}>
        <LatticeContext.Provider value={lattice}>
          <svg className='absolute overflow-visible pointer-events-none' style={fadeStyle} width={1} height={1}>
            <defs>
              {lineHues.map((hue) => (
                <Markers
                  key={hue ?? 'default'}
                  id={`${markerId}-${hue ?? 'default'}`}
                  cell={cell}
                  hue={hue}
                  width={linkWidth}
                />
              ))}
            </defs>
          </svg>
          {groups.map((group) => (
            <Fragment key={group.layer.id}>
              <svg className='absolute overflow-visible pointer-events-none' style={fadeStyle} width={1} height={1}>
                {group.links.map(({ link, path }) => (
                  <g key={link.id}>
                    {/* A wide transparent twin makes the thin stroke easy to press. */}
                    {handlers && (
                      <path
                        d={path}
                        className='fill-none stroke-transparent pointer-events-auto cursor-pointer'
                        style={{ pointerEvents: 'stroke' }}
                        strokeWidth={12 * unit}
                        onPointerDown={(event) => handlers.onLinkPointerDown?.(link, event)}
                        onPointerEnter={() => handlers.onLinkHover?.(link.id)}
                        onPointerLeave={() => handlers.onLinkHover?.(undefined)}
                        onDoubleClick={(event) => handlers.onLinkDoubleClick?.(link, event)}
                        onContextMenu={(event) => handlers.onLinkContextMenu?.(link, event)}
                      />
                    )}
                    <path
                      d={path}
                      className={mx(
                        'fill-none',
                        plain
                          ? lineClasses(lines.get(link.id)?.hue).stroke
                          : selected?.has(link.id)
                            ? 'stroke-focus'
                            : hoveredLink === link.id
                              ? 'stroke-focus/50'
                              : lineClasses(lines.get(link.id)?.hue).stroke,
                      )}
                      strokeWidth={linkWidth}
                      strokeDasharray={dashArray(lines.get(link.id)?.lineStyle, linkWidth)}
                      strokeLinecap={lines.get(link.id)?.lineStyle === 'dotted' ? 'round' : undefined}
                      data-link-id={link.id}
                    />
                    {link.text && <LinkText path={path} text={link.text} />}
                  </g>
                ))}
              </svg>
              {group.nodes.map((node) => (
                <NodeFrame
                  key={node.id}
                  store={store}
                  scene={scene}
                  registry={registry}
                  node={node}
                  styles={styles}
                  zoom={zoom}
                  depth={depth}
                  liveDepth={liveDepth}
                  selected={!plain && (selected?.has(node.id) ?? false)}
                  hovered={hover === node.id}
                  opening={opening === node.id}
                  fade={focus && focus.id !== node.id ? fadeStyle : undefined}
                  chromeFade={focus?.id === node.id ? fadeStyle : undefined}
                  editingPart={editing?.id === node.id ? editing.part : undefined}
                  active={active === node.id}
                  ghost={ghost === node.id}
                  debug={debug}
                  handlers={handlers}
                />
              ))}
              {/* The ends paint over the layer's nodes, so an end centred on a node's edge shows whole. */}
              <svg className='absolute overflow-visible pointer-events-none' style={fadeStyle} width={1} height={1}>
                {group.links.map(({ link, path }) => (
                  <path
                    key={link.id}
                    d={path}
                    className='fill-none stroke-none'
                    markerStart={markerUrl(linkMarkers(link).start, 'start', lines.get(link.id)?.hue)}
                    markerEnd={markerUrl(linkMarkers(link).end, 'end', lines.get(link.id)?.hue)}
                  />
                ))}
              </svg>
            </Fragment>
          ))}
        </LatticeContext.Provider>
      </CellContext.Provider>
    );
  },
);

SceneLayer.displayName = 'SceneLayer';

/** The width of a node frame's border, which a nested scene drawn inside it steps out over. */
const FRAME_BORDER = '--scene-frame-border' as const;

/** A link's stroke, in scene units like a node's 2px border, so a link keeps its weight beside the shapes at any zoom. */
const LINK_WIDTH = 2;

/** The most a nested scene's lines thicken by. */
const MAX_LINE_WEIGHT = 2;

/**
 * How much thicker a layer draws its lines: a scene seen inside another is small, so its borders and links thicken,
 * up to double, as it shrinks; at its own size (as it is drilled into) it is back to 1, so nothing jumps at the swap.
 */
export const lineWeight = (depth: number, zoom: number): number =>
  depth > 0 ? Math.min(MAX_LINE_WEIGHT, Math.max(1, 1 / Math.max(zoom, 0.05))) : 1;

/** Scene px of a nominal unit for the layers below a `SceneLayer` given one, so nested scenes draw alike. */
const CellContext = createContext(DEFAULT_CELL);

/** The lattice smart links route on, inherited by nested layers. */
const LatticeContext = createContext<LatticeSpec | undefined>(undefined);

/** The scene's minor grid, in px, on each node frame for the text inside it. */
const MINOR_GRID = '--dx-minor-grid';

/**
 * A text part covers the frame from its outer edge, border included, so its lines start on the grid the frame's edge is
 * on rather than a border width inside it.
 */
// Spelled out, not built from `FRAME_BORDER`: Tailwind only emits classes it can read verbatim.
// The text's own box is flush with the frame's edge and pads its text a grid unit either side; its lines need no
// padding above or below, being on the grid already.
const TEXT_BOX = 'absolute inset-[calc(-1*var(--scene-frame-border,2px))] [&>span]:px-(--dx-minor-grid)';

/** A line is a whole number of minor grid units tall, the text centred in it, so lines of text sit on the grid. */
const LINE_ON_GRID = mx(
  // Important: a size class (`text-lg`) carries its own leading, which would otherwise win.
  '[--dx-line:round(up,1.25em,var(--dx-minor-grid))] leading-(--dx-line)!',
);

/** A line pattern's dashes in scene units, relative to the stroke; a dot is a zero-length dash with a round cap. */
const dashArray = (dash: LineStyle['lineStyle'], width = LINK_WIDTH): string | undefined =>
  dash === 'dashed' ? `${4 * width} ${3 * width}` : dash === 'dotted' ? `0 ${2.5 * width}` : undefined;

/** Bounding box of every end, in nominal units: a quarter of a major grid cell. */
const END_BOX = 0.25;

/** The end markers, one per kind and end: a start marker points back along the path, an end marker along it. */
const Markers = ({ id, cell, hue, width }: { id: string; cell: number; hue: string | undefined; width: number }) => {
  const line = lineClasses(hue);
  // Each end fills a box of `END_BOX` nominal units, so it scales with the grid and the shapes it joins: the
  // arrow and the triangle 10 of their 12 view units, the circle 8 of its 10.
  const box = END_BOX * cell;
  const arrow = box;
  const triangle = (box * 12) / 10;
  const circle = (box * 10) / 8;
  // An outline matches the line's width, in its marker's view units.
  const outline = (size: number, view: number) => (width * view) / size;
  const ends = ['start', 'end'] as const;
  return (
    <>
      {ends.map((end) => (
        <marker
          key={`arrow-${end}`}
          id={`${id}-arrow-${end}`}
          viewBox='-1 -1 12 12'
          refX={10}
          refY={5}
          markerWidth={(arrow * 12) / 10}
          markerHeight={(arrow * 12) / 10}
          markerUnits='userSpaceOnUse'
          orient={end === 'start' ? 'auto-start-reverse' : 'auto'}
        >
          {/* An open arrowhead: two strokes, not a filled head. */}
          <path
            d='M 0 0 L 10 5 L 0 10'
            className={mx('fill-none', line.stroke)}
            strokeWidth={outline((arrow * 12) / 10, 12)}
            strokeLinecap='round'
            strokeLinejoin='round'
          />
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
            className={mx('fill-base-surface', line.stroke)}
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
            className={mx('fill-base-surface', line.stroke)}
            strokeWidth={outline(circle, 10)}
          />
        </marker>
      ))}
    </>
  );
};

type LinkTextProps = { path: string; text: string };

/** A caption's backdrop margin around its text, in scene units. */
const LINK_TEXT_PAD = { x: 8, y: 2 };

/** A link's caption at the middle of its route, over a halo of the canvas so it reads where it crosses lines. */
const LinkText = ({ path, text }: LinkTextProps) => {
  const ref = useRef<SVGPathElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const [at, setAt] = useState<{ x: number; y: number }>();
  const [box, setBox] = useState<{ x: number; y: number; width: number; height: number }>();
  // The route is only known as drawn: its midpoint is measured along the path, not between its ends.
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) {
      const { x, y } = element.getPointAtLength(element.getTotalLength() / 2);
      setAt({ x, y });
    }
  }, [path]);
  // The backdrop fits the text as set, so it is measured once the text is placed.
  useLayoutEffect(() => {
    const element = textRef.current;
    if (element && at) {
      const { x, y, width, height } = element.getBBox();
      setBox({
        x: x - LINK_TEXT_PAD.x,
        y: y - LINK_TEXT_PAD.y,
        width: width + LINK_TEXT_PAD.x * 2,
        height: height + LINK_TEXT_PAD.y * 2,
      });
    }
  }, [at, text]);
  return (
    <>
      <path ref={ref} d={path} className='fill-none stroke-none' />
      {at && (
        <>
          {/* Opaque, so the caption reads over the lines it sits on. */}
          {box && <rect {...box} rx={box.height / 2} className='fill-base-surface' data-link-text-box />}
          <text
            ref={textRef}
            x={at.x}
            y={at.y}
            textAnchor='middle'
            dominantBaseline='central'
            className='fill-fg-muted text-sm'
            data-link-text
          >
            {text}
          </text>
        </>
      )}
    </>
  );
};

type NodeFrameProps = Omit<NodeViewProps, 'editing'> & {
  hovered?: boolean;
  editingPart?: PartKey;
  ghost?: boolean;
  debug?: boolean;
  handlers?: ElementHandlers;
  /** The fade while another node is zoomed into. */
  fade?: CSSProperties;
  /** The fade of this node's own frame (fill and border) while it is zoomed into; its contents stay. */
  chromeFade?: CSSProperties;
  /** The drawing's style classes, under the node's own style. */
  styles?: StyleMap;
};

/** Positions a node, owns its frame styling and pointer events; the node definition renders the body. */
const NodeFrame = memo(
  ({ handlers, hovered, editingPart, ghost, debug, fade, chromeFade, styles, ...props }: NodeFrameProps) => {
    const { node, registry, selected } = props;
    const cell = useContext(CellContext);
    const drawn = useMemo(() => classedNode(node, styles), [node, styles]);
    const bounds = nodeBounds(node);
    const interactive = handlers !== undefined && !ghost;
    // A type the registry does not know is drawn as the core base: a box with its label.
    const def = nodeDef(registry, node);
    const Component = def?.component ?? BoxNodeView;
    const Toolbar = interactive ? def?.toolbar : undefined;
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
    // Being zoomed into, the frame becomes the child scene's canvas, so it drops its fill (the first class)
    // at once and keeps only its own border, not the selection's or the hover's.
    // `fontSize` is inherited by every text part, so an override set on the node reaches the label,
    // the class compartments and the editor alike; unset, the parts keep their own theme sizes.
    // The frame's border is 2px, thickened with the layer's lines (`lineWeight`); fading, it is padding instead.
    const border = 2 * lineWeight(props.depth, props.zoom);
    const thick = border !== 2;
    const frameStyle: CSSProperties & Record<`--${string}`, string> = {
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      fontSize: drawn.style?.fontSize,
      [FRAME_BORDER]: chromeFade ? '0px' : `${border}px`,
      [MINOR_GRID]: `${cell / MAJOR_GRID_RATIO}px`,
      ...(thick ? (chromeFade ? { padding: border } : { borderWidth: border }) : {}),
      ...fade,
    };
    const frameLook = props.opening ? frameClasses(drawn, false).slice(1) : frameClasses(drawn, selected, hovered);
    return (
      <>
        <div
          className={mx(
            'absolute box-border overflow-hidden',
            // Fading, the border becomes padding of the same width so the contents stay put.
            ...(chromeFade ? ['p-0.5 isolate'] : ['border-2', ...frameLook]),
            // Every text part inherits the face, as it does `fontSize`.
            drawn.style?.fontFamily === 'monospace' && 'font-mono',
            interactive && !node.locked && 'cursor-grab',
            ghost && 'opacity-50 border-dashed pointer-events-none',
          )}
          style={frameStyle}
          data-node-id={node.id}
          data-ghost={ghost || undefined}
          onPointerDown={
            interactive
              ? (event) => {
                  // React bubbles a portal's events through the tree: a press in a menu the node's content opened is
                  // not a press on the node.
                  if (event.target instanceof Element && event.currentTarget.contains(event.target)) {
                    handlers.onNodePointerDown?.(node, event);
                  }
                }
              : undefined
          }
        >
          {/* Fading, the frame's fill and border are drawn behind the contents so they fade without them. */}
          {chromeFade && (
            <div
              aria-hidden
              className={mx('dx-cover -z-10 border-2 pointer-events-none', ...frameLook)}
              style={thick ? { ...chromeFade, borderWidth: border } : chromeFade}
            />
          )}
          <Component {...props} node={drawn} editing={editing} onOpen={onOpen} />
          {debug && (
            <div
              className='absolute top-0 left-0 px-1 text-[10px] leading-4 font-mono whitespace-nowrap bg-modal-surface text-fg-muted pointer-events-none'
              data-testid='node-debug'
            >
              {node.id} · {node.type} · {bounds.x},{bounds.y} {bounds.width}×{bounds.height} · z {node.z}
            </div>
          )}
        </div>
        {Toolbar && (
          // Outside the frame, which clips its contents; scaled back to screen size from its bottom-right corner. Its
          // own width (`w-max`): near the layer's edge an absolute box would shrink to the space left. Shown with the
          // frame's hover or selection, and kept while the pointer crosses onto it.
          <div
            className={mx(
              'absolute flex w-max pb-1 transition-opacity',
              hovered || selected ? 'opacity-100' : 'opacity-0 hover:opacity-100',
            )}
            style={{
              left: bounds.x + bounds.width,
              top: bounds.y,
              transform: `translate(-100%, -100%) scale(${1 / Math.max(props.zoom, 0.05)})`,
              transformOrigin: 'bottom right',
              ...fade,
            }}
            data-testid='node-toolbar'
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <Toolbar {...props} node={drawn} editing={editing} onOpen={onOpen} />
          </div>
        )}
      </>
    );
  },
);

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
      TEXT_BOX,
      'whitespace-pre-wrap',
      LINE_ON_GRID,
      alignClasses(node.style, { horizontal: 'center', vertical: 'middle' }),
      sizeClass(node, 'text-lg'),
    )}
  >
    {label}
  </TextPart>
);

/** A node's core-base `label`, read from any type: a type the registry does not know still carries it. */
const baseLabel = (node: Node): string => {
  const label: unknown = Reflect.get(node, 'label');
  return typeof label === 'string' ? label : '';
};

const LabelNodeView = ({ node, editing }: NodeViewProps) => (
  <LabelPart node={node} editing={editing} label={baseLabel(node)} />
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
    <TextPart
      part='text'
      text={text}
      editing={editing}
      classNames={mx(
        TEXT_BOX,
        'whitespace-pre-wrap',
        LINE_ON_GRID,
        alignClasses(node.style, { horizontal: 'left', vertical: 'top' }),
      )}
    >
      {text}
    </TextPart>
  );
};

/**
 * A frame over a child scene: the centred label, or with `contents` the child drawn inside the frame (a
 * preview, then the live scene as it grows on screen), and a zoom-in control at the top-right.
 */
export const FrameNodeView = (props: NodeViewProps) => {
  const { node, store, registry, zoom, depth, liveDepth, opening, editing, onOpen } = props;
  const child = useAtomValue(store.scene(isFrameNode(node) ? node.scene : ''));
  const contents = opening || (isFrameNode(node) && showsContents(node));
  // Being entered, the portal is already the child scene on the canvas: live.
  const tier = !child ? 'dot' : opening ? 'live' : tierFor(node, zoom, depth, liveDepth);
  const bounds = useMemo(() => (child ? portalFrame(node, contentBounds(child)) : undefined), [node, child]);
  const title = (isFrameNode(node) ? node.label : undefined) ?? child?.name ?? child?.id ?? '';
  // Too small to show anything inside (or with no child yet), it reads as a closed scene: frame and title.
  if (!contents || tier === 'dot') {
    return (
      <>
        <LabelPart node={node} editing={editing} label={title} />
        {onOpen && <OpenControl onOpen={onOpen} />}
      </>
    );
  }
  return (
    <div className='dx-cover'>
      {tier === 'preview' && child && (
        <div className='dx-cover flex flex-col items-center justify-center gap-1 pointer-events-none'>
          <span className='text-lg'>{title}</span>
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
          // the scene jumped by that at the drill-in swap. The width is the frame's own (`FRAME_BORDER`),
          // since a fading frame trades its border for padding.
          <div
            className='absolute pointer-events-none'
            style={{
              top: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
              left: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
              transform: portalTransform(node, bounds),
              transformOrigin: '0 0',
            }}
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

export type OpenControlProps = { label?: string; onOpen: () => void };

/** The open control at a frame's top-right; it takes the press, so it neither drags nor selects the node. */
export const OpenControl = ({ label = 'Open scene', onOpen }: OpenControlProps) => (
  <Button.Root
    variant='ghost'
    iconOnly
    icon='ph--arrows-out--regular'
    label={label}
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
