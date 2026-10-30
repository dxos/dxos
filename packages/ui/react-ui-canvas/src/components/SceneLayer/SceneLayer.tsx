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

import { type EffectStatus } from '@dxos/animation';
import { frameTimeAttribute } from '@dxos/animation';
import { SvgFile } from '@dxos/diagram';
import * as Button from '@dxos/react-ui/Button';
import {
  type ElementId,
  type LineStyle,
  LINK_FONT_SIZE,
  type LinkEnds,
  type LinkId,
  MAJOR_GRID_RATIO,
  type Marker,
  type Node,
  type NodeId,
  type StyleMap,
  isDiagramNode,
  isGeneratorNode,
  isInstanceNode,
  isNoteNode,
  isPathNode,
  isViewNode,
  linkMarkers,
  nodeFrame,
  showsContents,
} from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { type GeneratorFrames, type Shape } from '../../generator/index.ts';
import { type ElementHandlers, useSceneLook } from '../../hooks/index.ts';
import {
  type LinkKind,
  NO_STYLES,
  type NodeDef,
  type NodeRegistry,
  type NodeViewProps,
  RADIUS_PX,
  SOFT_GROOVE_LIP,
  SOFT_RELIEF,
  SOFT_VARS,
  type SoftRelief,
  type View,
  type ViewStore,
  nodeDef,
  styleVariant,
} from '../../model/index.ts';
import {
  BORDER_CLASSES,
  CAPTION_TEXT,
  DEFAULT_CELL,
  GROOVE_CLASSES,
  type LatticeSpec,
  type MarkerFrame,
  type PartEditing,
  type PartKey,
  SOFT_CANVAS_FILL,
  alignClasses,
  canvasFillClass,
  classedLink,
  classedNode,
  compositeBounds,
  contentBounds,
  cornerRadius,
  diagramLinkMarkup,
  diagramNodeMarkup,
  elementLayer,
  frameClasses,
  grooveHeads,
  grooveTrim,
  instanceTransform,
  instanceView,
  isMultiline,
  lineClasses,
  markerFrame,
  markerTrim,
  nodeBounds,
  nodeParts,
  nodeRelief,
  portalFrame,
  portalScale,
  portalTransform,
  sortByZ,
  trimPath,
  viewLayers,
  viewLinkGeometry,
  visibleView,
} from '../../utils/index.ts';
import { TextPart } from '../PartEditor/index.ts';
import { renderMarkup } from './markup.ts';

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

export type SceneLayerProps = {
  store: ViewStore;
  scene: View;
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
  /** A node in an edit mode of its own (its vertices), drawn translucent so its handles read over it. */
  dimmed?: NodeId;
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
  /** What the scene's generator nodes drew, and when; drawn in a generator layer per scene layer (ANIMATION.md §7.1). */
  generated?: GeneratorFrames;
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
    dimmed,
    active,
    ghost,
    debug,
    handlers,
    lattice: latticeProp,
    cell: cellProp,
    generated,
  }: SceneLayerProps) => {
    const inherited = useContext(CellContext);
    const inheritedGenerated = useContext(GeneratedContext);
    const cell = cellProp ?? inherited;
    // A nested scene (a frame's contents, a drill-in in flight) routes on its parent's lattice, so its links do not
    // jump onto the gutters when it settles as the root.
    const inheritedLattice = useContext(LatticeContext);
    const lattice = latticeProp ?? inheritedLattice;
    // A hidden layer's elements are not drawn (nor, for the root, hit: the view hit-tests the same visible scene).
    const scene = useMemo(() => visibleView(sceneProp), [sceneProp]);
    const links = useMemo(
      () => viewLinkGeometry(scene, registry, sortByZ(Object.values(scene.links)), lattice),
      [scene, registry, lattice],
    );
    // Paint order is the layers', bottom first: each layer's links, then its nodes, then its links' ends, so an upper
    // layer covers a lower one whole. Within a layer it is z, with the selection on top: a selected node is being
    // worked on and must not hide under a neighbour, while the model's order stays what the user arranged.
    const groups = useMemo(() => {
      const layers = viewLayers(scene);
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
    const look = useSceneLook();
    const weight = lineWeight(depth, zoom);
    const linkWidth = look.styleSet.link.width * weight;
    // End markers keep the line's own weight whatever the set draws the link as, so an arrowhead stays crisp.
    const markerWidth = LINK_WIDTH * weight;
    const canvasFill = canvasFillClass(look, 'opaque');
    // Everything but the portal being zoomed into fades with the zoom (see `layerOpacity`).
    const fadeStyle: CSSProperties | undefined = focus && focus.opacity < 1 ? { opacity: focus.opacity } : undefined;
    // One set of end markers per line colour in use, sized in scene units so they scale with the nodes they join.
    const markerId = useId();
    const lineHues = useMemo(() => [...new Set([...lines.values()].map((line) => line?.hue))], [lines]);
    const markerUrl = (marker: Marker | undefined, end: 'start' | 'end', hue: string | undefined) =>
      marker ? `url(#${markerId}-${hue ?? 'default'}-${marker}-${end})` : undefined;
    // Diagram connectors draw the diagram renderer's own markers, defined once per layer.
    const diagramMarkers = useMemo(() => SvgFile.markerIds(`${markerId}-dx`), [markerId]);
    const hasDiagram = links.some(({ diagram }) => diagram !== undefined);

    return (
      <CellContext.Provider value={cell}>
        <GeneratedContext.Provider value={generated ?? inheritedGenerated}>
          <LatticeContext.Provider value={lattice}>
            <svg className='absolute overflow-visible pointer-events-none' style={fadeStyle} width={1} height={1}>
              <defs>
                {lineHues.map((hue) => (
                  <Markers
                    key={hue ?? 'default'}
                    id={`${markerId}-${hue ?? 'default'}`}
                    cell={cell}
                    hue={hue}
                    width={markerWidth}
                    canvasFill={canvasFill}
                  />
                ))}
                {hasDiagram && SvgFile.markerDefs(diagramMarkers).map((marker, index) => renderMarkup(marker, index))}
              </defs>
            </svg>
            {groups.map((group) => (
              <Fragment key={group.layer.id}>
                <svg className='absolute overflow-visible pointer-events-none' style={fadeStyle} width={1} height={1}>
                  {group.links.map(({ link, path, diagram }) => (
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
                      {diagram && link.connector ? (
                        <DiagramLink
                          path={path}
                          markup={diagramLinkMarkup(link, link.connector, diagram, diagramMarkers)}
                          highlight={
                            plain
                              ? undefined
                              : selected?.has(link.id)
                                ? 'stroke-focus'
                                : hoveredLink === link.id
                                  ? 'stroke-focus/50'
                                  : undefined
                          }
                          linkId={link.id}
                        />
                      ) : (
                        <LinkStroke
                          id={`${markerId}-${link.id}`}
                          kind={look.styleSet.link.kind}
                          path={path}
                          stroke={
                            plain
                              ? lineClasses(lines.get(link.id)?.hue).stroke
                              : selected?.has(link.id)
                                ? 'stroke-focus'
                                : hoveredLink === link.id
                                  ? 'stroke-focus/50'
                                  : lineClasses(lines.get(link.id)?.hue).stroke
                          }
                          emphasis={!plain && (selected?.has(link.id) || hoveredLink === link.id)}
                          width={linkWidth}
                          lineStyle={lines.get(link.id)?.lineStyle}
                          linkId={link.id}
                          ends={linkMarkers(link)}
                          endSize={END_BOX * cell}
                          markerWidth={markerWidth}
                        />
                      )}
                      {link.text && !diagram && (
                        <LinkText
                          path={path}
                          text={link.text}
                          backdrop={canvasFillClass(look, look.styleSet.link.caption)}
                          textClass={CAPTION_TEXT[look.tone]}
                          fontSize={lines.get(link.id)?.fontSize ?? LINK_FONT_SIZE}
                        />
                      )}
                    </g>
                  ))}
                </svg>
                {/* Above the layer's links, below its nodes; marked with the time it drew, which export waits on. */}
                {generated && group.nodes.some(isGeneratorNode) && (
                  <GeneratedShapes
                    store={store}
                    registry={registry}
                    zoom={zoom}
                    depth={depth}
                    t={generated.t}
                    shapes={group.nodes.flatMap((node) => generated.frames[node.id]?.shapes ?? [])}
                    style={fadeStyle}
                  />
                )}
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
                    fade={focus && focus.id !== node.id ? fadeStyle : dimmed === node.id ? DIMMED : undefined}
                    chromeFade={focus?.id === node.id ? fadeStyle : undefined}
                    editingPart={editing?.id === node.id ? editing.part : undefined}
                    active={active === node.id}
                    ghost={ghost === node.id}
                    framed={ghost === node.id || (!!plain && (selected?.has(node.id) ?? false))}
                    debug={debug}
                    handlers={handlers}
                  />
                ))}
                {/* The ends paint over the layer's nodes, so an end centred on a node's edge shows whole. */}
                <svg className='absolute overflow-visible pointer-events-none' style={fadeStyle} width={1} height={1}>
                  {group.links.map(({ link, path, diagram }) =>
                    // A groove draws its ends with its track.
                    diagram || look.styleSet.link.kind === 'groove' ? null : (
                      <path
                        key={link.id}
                        d={path}
                        className='fill-none stroke-none'
                        markerStart={markerUrl(linkMarkers(link).start, 'start', lines.get(link.id)?.hue)}
                        markerEnd={markerUrl(linkMarkers(link).end, 'end', lines.get(link.id)?.hue)}
                      />
                    ),
                  )}
                </svg>
              </Fragment>
            ))}
          </LatticeContext.Provider>
        </GeneratedContext.Provider>
      </CellContext.Provider>
    );
  },
);

SceneLayer.displayName = 'SceneLayer';

/** The generator frames of the root layer, for the generator nodes' own views (their status). */
const GeneratedContext = createContext<GeneratorFrames | undefined>(undefined);

type GeneratedShapesProps = Pick<SceneLayerProps, 'store' | 'registry' | 'zoom' | 'depth'> & {
  t: number;
  shapes: readonly Shape[];
  style?: CSSProperties;
};

/** A shape's paint: its CSS colour, else its theme hue, else the text colour. */
const paint = (shape: { hue?: string; color?: string }, kind: 'fill' | 'stroke') =>
  shape.color
    ? { [kind]: shape.color }
    : {
        className: shape.hue ? lineClasses(shape.hue)[kind] : undefined,
        [kind]: shape.hue ? undefined : 'currentColor',
      };

export type ShapeLayerProps = {
  /** The time the shapes were drawn for, which a frame renderer waits on. */
  t: number;
  shapes: readonly Shape[];
  style?: CSSProperties;
  testId?: string;
};

/**
 * Shapes in scene coordinates, as one SVG under the camera: a generator's or an animator effect's `2d` items. Instances
 * are left to the caller, since drawing a composite needs the scene store.
 */
export const ShapeLayer = ({ t, shapes, style, testId = 'generator-layer' }: ShapeLayerProps) => (
  <svg
    className='absolute overflow-visible pointer-events-none'
    style={style}
    width={1}
    height={1}
    data-frame-time={frameTimeAttribute(t)}
    data-testid={testId}
  >
    {shapes.map((shape, index) => {
      switch (shape.kind) {
        case 'circle':
          return (
            <circle
              key={index}
              cx={shape.center.x}
              cy={shape.center.y}
              r={shape.radius}
              opacity={shape.opacity}
              {...paint(shape, 'fill')}
            />
          );
        case 'rect':
          return (
            <rect key={index} {...shape.bounds} rx={shape.radius} opacity={shape.opacity} {...paint(shape, 'fill')} />
          );
        case 'path':
          return (
            <path
              key={index}
              d={shape.d}
              fill='none'
              strokeWidth={shape.width ?? 2}
              strokeLinecap='round'
              strokeLinejoin='round'
              opacity={shape.opacity}
              {...(shape.reveal !== undefined
                ? { pathLength: 1, strokeDasharray: `${Math.max(0, shape.reveal)} 1` }
                : {})}
              {...paint({ hue: shape.hue, color: shape.color ?? shape.stroke }, 'stroke')}
            />
          );
        case 'instance':
          return null;
      }
    })}
  </svg>
);

/** A generator layer: the shapes the layer's generators returned, in scene coordinates. */
const GeneratedShapes = ({ store, registry, zoom, depth, t, shapes, style }: GeneratedShapesProps) => (
  <>
    <ShapeLayer t={t} shapes={shapes} style={style} />
    {shapes.map((shape, index) =>
      shape.kind === 'instance' ? (
        <InstanceShape
          key={index}
          store={store}
          registry={registry}
          zoom={zoom}
          depth={depth}
          composite={shape.composite}
          center={shape.center}
          scale={shape.scale ?? 1}
          opacity={shape.opacity}
        />
      ) : null,
    )}
  </>
);

type InstanceShapeProps = Pick<SceneLayerProps, 'store' | 'registry' | 'zoom' | 'depth'> & {
  composite: string;
  center: { x: number; y: number };
  scale: number;
  opacity?: number;
};

/** A composite a generator placed: drawn about `center`, scaled, read-only. */
const InstanceShape = ({ store, registry, zoom, depth, composite, center, scale, opacity }: InstanceShapeProps) => {
  const scene = useAtomValue(store.view(composite));
  const content = useMemo(() => (scene ? compositeBounds(scene) : undefined), [scene]);
  if (!scene || !content) {
    return null;
  }
  const x = center.x - (content.x + content.width / 2) * scale;
  const y = center.y - (content.y + content.height / 2) * scale;
  return (
    <div
      className='absolute pointer-events-none'
      style={{ transform: `translate(${x}px, ${y}px) scale(${scale})`, transformOrigin: '0 0', opacity }}
    >
      <SceneLayer store={store} scene={scene} registry={registry} zoom={zoom * scale} depth={depth + 1} liveDepth={0} />
    </div>
  );
};

/** A paused generator's reason, shown over its frame. */
const GeneratorWarning = ({ status }: { status: Extract<EffectStatus, { state: 'paused' }> }) => (
  <div
    className='absolute top-1 left-1 right-1 flex items-start gap-1 p-1 rounded-sm text-xs bg-modal-surface text-error-text pointer-events-none'
    data-testid='generator-paused'
    title={status.message}
  >
    <span className='shrink-0'>{status.reason === 'budget' ? 'Over budget:' : 'Error:'}</span>
    <span className='line-clamp-3'>{status.message}</span>
  </div>
);

/**
 * A generator node draws nothing of its own: its shapes are in the layer's generator layer. A paused generator shows
 * why over its frame.
 */
export const GeneratorNodeView = ({ node }: NodeViewProps) => {
  const generated = useContext(GeneratedContext);
  const status = generated?.frames[node.id]?.status;
  return status?.state === 'paused' ? <GeneratorWarning status={status} /> : null;
};

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
// padding above or below, being on the grid already. The child is the static text's span or the editor's root alike,
// so the text does not move when editing starts.
const TEXT_BOX = 'absolute inset-[calc(-1*var(--scene-frame-border,2px))] [&>*]:px-(--dx-minor-grid)';

/** A line is a whole number of minor grid units tall, the text centred in it, so lines of text sit on the grid. */
const LINE_ON_GRID = mx(
  // Important: a size class (`text-lg`) carries its own leading, which would otherwise win.
  '[--dx-line:round(up,1.25em,var(--dx-minor-grid))] leading-(--dx-line)!',
);

/**
 * A text node's lines are 1.5em, tighter than the grid's, and its block is padded so the text sits a minor grid unit
 * from the top and bottom, as it does from the sides; the padding gives back the line's own half-leading (0.25em).
 */
const TEXT_LINES = mx('leading-[1.5]!', '[&>*]:py-[max(0px,calc(var(--dx-minor-grid)-0.25em))]');

/** A line pattern's dashes in scene units, relative to the stroke; a dot is a zero-length dash with a round cap. */
const dashArray = (dash: LineStyle['lineStyle'], width = LINK_WIDTH): string | undefined =>
  dash === 'dashed' ? `${4 * width} ${3 * width}` : dash === 'dotted' ? `0 ${2.5 * width}` : undefined;

/** Bounding box of every end, in nominal units: a quarter of a major grid cell. */
const END_BOX = 0.25;

/** The end markers, one per kind and end: a start marker points back along the path, an end marker along it. */
type MarkersProps = {
  id: string;
  cell: number;
  hue: string | undefined;
  width: number;
  /** The canvas colour a hollow end is filled with, so the line stops at its rim. */
  canvasFill: string;
};

const Markers = ({ id, cell, hue, width, canvasFill }: MarkersProps) => {
  const line = lineClasses(hue);
  // Each end fills a box of `END_BOX` nominal units, so it scales with the grid and the shapes it joins.
  const box = END_BOX * cell;
  const arrow = markerFrame('arrow', box, width);
  const triangle = markerFrame('triangle', box, width);
  const circle = markerFrame('circle', box, width);
  // An outline matches the line's width, in its marker's view units.
  const outline = ({ size, view }: MarkerFrame) => (width * view) / size;
  const ends = ['start', 'end'] as const;
  // The mitred tip and the circle's far side sit at the anchor, so a marker reaches past its view box.
  const frame = ({ size, refX, refY }: MarkerFrame, end: 'start' | 'end') => ({
    refX,
    refY,
    markerWidth: size,
    markerHeight: size,
    markerUnits: 'userSpaceOnUse',
    overflow: 'visible',
    orient: end === 'start' ? 'auto-start-reverse' : 'auto',
  });
  return (
    <>
      {ends.map((end) => (
        <marker key={`arrow-${end}`} id={`${id}-arrow-${end}`} viewBox='-1 -1 12 12' {...frame(arrow, end)}>
          {/* An open arrowhead: two strokes meeting in a mitred point, not a filled head. */}
          <path
            d='M 0 0 L 10 5 L 0 10'
            className={mx('fill-none', line.stroke)}
            strokeWidth={outline(arrow)}
            strokeLinecap='round'
            strokeLinejoin='miter'
          />
        </marker>
      ))}
      {/* Inheritance (UML generalization): a triangle filled with the canvas, so the line stops at its base. */}
      {ends.map((end) => (
        <marker key={`triangle-${end}`} id={`${id}-triangle-${end}`} viewBox='-1 -1 12 12' {...frame(triangle, end)}>
          <path
            d='M 0 0 L 10 5 L 0 10 z'
            className={mx(canvasFill, line.stroke)}
            strokeWidth={outline(triangle)}
            strokeLinejoin='miter'
          />
        </marker>
      ))}
      {/* A circle filled with the canvas, its far side on the connection point, so the line stops under it. */}
      {ends.map((end) => (
        <marker key={`circle-${end}`} id={`${id}-circle-${end}`} viewBox='0 0 10 10' {...frame(circle, end)}>
          <circle cx={5} cy={5} r={4} className={mx(canvasFill, line.stroke)} strokeWidth={outline(circle)} />
        </marker>
      ))}
    </>
  );
};

type DiagramLinkProps = {
  path: string;
  markup: readonly SvgFile.Markup[];
  /** The selection's or the hover's stroke, drawn under the connector as an outline. */
  highlight?: string;
  linkId: string;
};

/** A diagram connector as the diagram's SVG renderer draws it, over the selection's outline when it has one. */
const DiagramLink = ({ path, markup, highlight, linkId }: DiagramLinkProps) => (
  <g data-link-id={linkId}>
    {highlight && <path d={path} className={mx('fill-none', highlight)} strokeWidth={6} strokeLinejoin='round' />}
    <g className={SvgFile.ROOT_CLASS}>{markup.map((element, index) => renderMarkup(element, index))}</g>
  </g>
);

type LinkStrokeProps = {
  /** Unique within the document, for a rails or glass link's mask. */
  id: string;
  kind: LinkKind;
  path: string;
  stroke: string;
  /** Selected or hovered: a groove, which draws no hue, then floors its channel in `stroke`. */
  emphasis?: boolean;
  width: number;
  lineStyle: LineStyle['lineStyle'];
  linkId: string;
  /** The link's end markers: the line stops under them, and a groove draws them as more channel. */
  ends: LinkEnds;
  /** An end's nominal size, in scene units. */
  endSize: number;
  /** The width of a marker's outline, in scene units. */
  markerWidth: number;
};

/**
 * A link's visible stroke as its style set draws it: a line; a tube, its hue lit along the middle; rails, two edges over
 * a faint strip; glass, a translucent strip with fine edges; or a groove, a channel pressed into the soft ground. The
 * line stops under each end, so it never shows past or through an end's point.
 */
const LinkStroke = ({
  id,
  kind,
  path: route,
  stroke,
  emphasis,
  width,
  lineStyle,
  linkId,
  ends,
  endSize,
  markerWidth,
}: LinkStrokeProps) => {
  const dash = dashArray(lineStyle, width);
  const groove = kind === 'groove';
  const round = groove || (kind === 'line' && lineStyle === 'dotted');
  const { start, end } = ends;
  const path = useMemo(() => {
    const trim = (marker: Marker | undefined) =>
      marker === undefined
        ? 0
        : groove
          ? grooveTrim(marker, width, endSize)
          : markerTrim(marker, endSize, markerWidth, { width, round });
    return trimPath(route, trim(start), trim(end));
  }, [route, start, end, groove, round, width, endSize, markerWidth]);
  const heads = useMemo(
    () => (groove && (start || end) ? grooveHeads(route, { start, end }, width, endSize) : ''),
    [groove, route, start, end, width, endSize],
  );
  if (groove) {
    return (
      <GrooveStroke
        path={path}
        heads={heads}
        stroke={stroke}
        emphasis={emphasis}
        width={width}
        dash={dash}
        linkId={linkId}
      />
    );
  }
  if (kind === 'line') {
    return (
      <path
        d={path}
        className={mx('fill-none', stroke)}
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinecap={round ? 'round' : undefined}
        data-link-id={linkId}
      />
    );
  }
  if (kind === 'tube') {
    return (
      <g strokeLinejoin='round' strokeDasharray={dash} data-link-id={linkId}>
        <path d={path} className={mx('fill-none', stroke)} strokeWidth={width} />
        <path d={path} className='fill-none stroke-white' strokeWidth={width * 0.45} opacity={0.4} />
      </g>
    );
  }
  // The edges are the strip with its middle masked out: an SVG stroke cannot be offset to either side of its path.
  const rail = kind === 'rails' ? Math.max(1, width / 5) : Math.max(0.75, width / 10);
  const maskId = `${id.replace(/[^\w-]/g, '_')}-edges`;
  return (
    <g strokeLinejoin='round' strokeDasharray={dash} data-link-id={linkId}>
      <mask id={maskId} maskUnits='userSpaceOnUse' x={-1e6} y={-1e6} width={2e6} height={2e6}>
        <path d={path} fill='none' stroke='white' strokeWidth={width} />
        <path d={path} fill='none' stroke='black' strokeWidth={width - rail * 2} />
      </mask>
      <path d={path} className={mx('fill-none', stroke)} strokeWidth={width} opacity={kind === 'rails' ? 0.12 : 0.3} />
      <path
        d={path}
        className={mx('fill-none', stroke)}
        strokeWidth={width}
        mask={`url(#${maskId})`}
        opacity={kind === 'rails' ? 1 : 0.7}
      />
    </g>
  );
};

type GrooveStrokeProps = Pick<LinkStrokeProps, 'path' | 'stroke' | 'emphasis' | 'width' | 'linkId'> & {
  /** The ends as more channel. */
  heads: string;
  dash: string | undefined;
};

/**
 * A channel pressed into the soft ground, its ends heads of the same channel: every lip is drawn before any floor, so
 * the track and its heads read as one cut. The lips are copies nudged down-right in light and up-left in shade, as an
 * SVG stroke cannot be offset or inset-shadowed and a filter per link would be far dearer to draw. The track stops
 * under each head, whose mitred point is the end.
 */
const GrooveStroke = ({ path, heads, stroke, emphasis, width, dash, linkId }: GrooveStrokeProps) => {
  const lip = Math.max(0.75, width * SOFT_GROOVE_LIP);
  const floor = emphasis ? stroke : GROOVE_CLASSES.floor;
  const layer = (className: string, offset: number, opacity?: number) => {
    const transform = offset ? `translate(${offset} ${offset})` : undefined;
    return (
      <>
        {path && (
          <path
            d={path}
            className={mx('fill-none', className)}
            strokeWidth={width}
            strokeDasharray={dash}
            transform={transform}
            opacity={opacity}
          />
        )}
        {heads && (
          <path
            d={heads}
            className={mx('fill-none', className)}
            strokeWidth={width}
            strokeLinejoin='miter'
            transform={transform}
            opacity={opacity}
          />
        )}
      </>
    );
  };
  return (
    <g strokeLinejoin='round' strokeLinecap='round' data-link-id={linkId}>
      {layer(GROOVE_CLASSES.highlight, lip)}
      {layer(GROOVE_CLASSES.shade, -lip)}
      {layer(floor, 0, emphasis ? 0.6 : undefined)}
    </g>
  );
};

type LinkTextProps = { path: string; text: string; backdrop: string; textClass: string; fontSize: number };

/** A caption's backdrop margin around its text, in scene units. */
const LINK_TEXT_PAD = { x: 8, y: 2 };

/** A link's caption at the middle of its route, over a halo of the canvas so it reads where it crosses lines. */
const LinkText = ({ path, text, backdrop, textClass, fontSize }: LinkTextProps) => {
  const ref = useRef<SVGPathElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  // The full caption, laid out but invisible, so it can be measured however much of it is shown.
  const measureRef = useRef<SVGTextElement>(null);
  const [at, setAt] = useState<{ x: number; y: number; room?: number }>();
  const [shown, setShown] = useState(text);
  const [box, setBox] = useState<{ x: number; y: number; width: number; height: number }>();
  // The route is only known as drawn: its midpoint is measured along the path, not between its ends.
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) {
      const length = element.getTotalLength();
      const { x, y } = element.getPointAtLength(length / 2);
      setAt({ x, y, room: horizontalRun(element, length) });
    }
  }, [path]);
  // On a horizontal run the caption fits between the run's ends, clear of the arrowheads, so a long one is shortened.
  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element || !at) {
      return;
    }
    const room = at.room === undefined ? Infinity : at.room - LINK_TEXT_PAD.x * 2 - LINK_TEXT_CLEARANCE * 2;
    if (text.length === 0 || element.getComputedTextLength() <= room) {
      setShown(text);
      return;
    }
    // The ellipsis takes about one character's width of what it replaces.
    const ellipsis = element.getComputedTextLength() / text.length;
    let count = text.length - 1;
    while (count > 0 && element.getSubStringLength(0, count) + ellipsis > room) {
      count--;
    }
    setShown(`${text.slice(0, count).trimEnd()}…`);
  }, [at, text, fontSize]);
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
  }, [at, shown, fontSize]);
  return (
    <>
      <path ref={ref} d={path} className='fill-none stroke-none' />
      {at && (
        <>
          {/* Opaque, so the caption reads over the lines it sits on. */}
          {box && <rect {...box} rx={box.height / 2} className={backdrop} data-link-text-box />}
          <text
            ref={textRef}
            x={at.x}
            y={at.y}
            textAnchor='middle'
            dominantBaseline='central'
            className={textClass}
            style={{ fontSize }}
            data-link-text
          >
            {shown !== text && <title>{text}</title>}
            {shown}
          </text>
          <text ref={measureRef} x={at.x} y={at.y} className='invisible' style={{ fontSize }} aria-hidden>
            {text}
          </text>
        </>
      )}
    </>
  );
};

/** Scene units kept clear at each end of a caption's run, for the arrowhead or bend there. */
const LINK_TEXT_CLEARANCE = 12;

/** Step, in scene units, when walking a route out from its midpoint. */
const RUN_STEP = 2;

/**
 * The horizontal extent of the straight run through a path's midpoint, or undefined when that run is steeper than
 * level (a caption there is not bounded by the line it sits on).
 */
const horizontalRun = (element: SVGPathElement, length: number): number | undefined => {
  const middle = length / 2;
  const mid = element.getPointAtLength(middle);
  const ahead = element.getPointAtLength(Math.min(length, middle + RUN_STEP));
  const dx = ahead.x - mid.x;
  const dy = ahead.y - mid.y;
  const step = Math.hypot(dx, dy);
  if (step === 0 || Math.abs(dy) > Math.abs(dx)) {
    return undefined;
  }
  // A point is on the run while it stays on the line through the midpoint in the run's direction.
  const straight = (at: number) => {
    const { x, y } = element.getPointAtLength(at);
    return Math.abs((x - mid.x) * dy - (y - mid.y) * dx) / step < 0.5;
  };
  let start = middle;
  while (start > 0 && straight(Math.max(0, start - RUN_STEP))) {
    start = Math.max(0, start - RUN_STEP);
  }
  let end = middle;
  while (end < length && straight(Math.min(length, end + RUN_STEP))) {
    end = Math.min(length, end + RUN_STEP);
  }
  return Math.abs(element.getPointAtLength(end).x - element.getPointAtLength(start).x);
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
  /** Outlines the node's frame lightly, for a shape being moved or drawn, whose own outline may not be its frame. */
  framed?: boolean;
};

/** Positions a node, owns its frame styling and pointer events; the node definition renders the body. */
const NodeFrame = memo(
  ({ handlers, hovered, editingPart, ghost, debug, fade, chromeFade, styles, framed, ...props }: NodeFrameProps) => {
    const { node, registry, selected } = props;
    const cell = useContext(CellContext);
    // A type the registry does not know is drawn as the core base: a box with its label.
    const def = nodeDef(registry, node);
    const drawn = useMemo(() => bareNode(classedNode(node, styles), def?.bare), [node, styles, def?.bare]);
    const bounds = nodeBounds(node);
    const interactive = handlers !== undefined && !ghost;
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
    const look = useSceneLook();
    const nominal = styleVariant(look.styleSet, drawn.style?.tone).borderWidth;
    const border = nominal * lineWeight(props.depth, props.zoom);
    const thick = border !== nominal;
    // A bare type drawing no fill or border has no frame at all: the frame clips its contents, so a transparent border
    // would shave the drawing (a 4px rule drew 2px) and a rounded corner would cut a glyph's sharp corners.
    const silhouette = chromeFade ? undefined : def?.silhouette;
    const borderless =
      (def?.bare === true && drawn.style?.border === false && drawn.style?.fill === false && !chromeFade) ||
      silhouette !== undefined;
    const circled = def?.bounds?.(drawn) === 'circle';
    // A screen pixel at any zoom.
    const hairline = 1 / Math.max(props.zoom, 0.05);
    const frameStyle: CSSProperties & Record<`--${string}`, string> = {
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      fontSize: drawn.style?.fontSize,
      ...(drawn.rotation ? { transform: `rotate(${drawn.rotation}deg)` } : {}),
      [FRAME_BORDER]: chromeFade || borderless ? '0px' : `${border}px`,
      [MINOR_GRID]: `${cell / MAJOR_GRID_RATIO}px`,
      ...(thick ? (chromeFade ? { padding: border } : { borderWidth: border }) : {}),
      ...(borderless ? { borderWidth: 0, borderRadius: 0 } : {}),
      // An outline, so the frame's layout is untouched; a screen pixel at any zoom.
      ...(framed && !circled ? { outlineWidth: hairline, outlineStyle: 'solid' } : {}),
      ...fade,
      ...nodeOpacity(drawn, fade),
    };
    const frameLook = props.opening
      ? frameClasses(drawn, false, false, def?.ellipse, look).slice(1)
      : frameClasses(drawn, selected, hovered, def?.ellipse, look);
    const silhouetteFilled = def?.filled?.(drawn) ?? true;
    const silhouetteRadius = RADIUS_PX[cornerRadius(drawn.style, styleVariant(look.styleSet, drawn.style?.tone))];
    const relief = silhouette && silhouetteFilled ? nodeRelief(drawn, look) : undefined;
    return (
      <>
        {silhouette &&
          relief && (
            // Beside the frame, which clips: a raised shadow falls outside the shape.
            <SilhouetteRelief
              outline={silhouette}
              node={drawn}
              border={border}
              radius={silhouetteRadius}
              relief={relief}
              className={mx(ghost && 'opacity-50')}
              style={{
                left: bounds.x,
                top: bounds.y,
                ...(drawn.rotation ? { transform: `rotate(${drawn.rotation}deg)` } : {}),
                ...fade,
                ...nodeOpacity(drawn, fade),
              }}
            />
          )}
        <div
          className={mx(
            'absolute box-border',
            !def?.unclipped && 'overflow-hidden',
            // Fading, the border becomes padding of the same width so the contents stay put.
            ...(chromeFade
              ? [BORDER_CLASSES[nominal].padding, 'isolate']
              : silhouette
                ? []
                : [BORDER_CLASSES[nominal].border, ...frameLook]),
            // Every text part inherits the face, as it does `fontSize`.
            drawn.style?.fontFamily === 'monospace' && 'font-mono',
            interactive && !node.locked && 'cursor-grab',
            ghost && 'opacity-50 border-dashed pointer-events-none',
            framed && !circled && 'outline-focus/40',
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
              className={mx('dx-cover -z-10', BORDER_CLASSES[nominal].border, 'pointer-events-none', ...frameLook)}
              style={thick ? { ...chromeFade, borderWidth: border } : chromeFade}
            />
          )}
          {silhouette ? (
            // The look's classes on a box-less wrapper, so the silhouette's layers inherit its colours.
            <div className={mx('contents', ...frameLook)}>
              <Silhouette
                outline={silhouette}
                filled={silhouetteFilled}
                // An inset relief draws the fill itself, under its inner shadow.
                fill={relief !== 'inset'}
                node={drawn}
                border={border}
                radius={silhouetteRadius}
                // A guide is dashed whatever its line style, as a box's border is.
                lineStyle={
                  drawn.style?.guide
                    ? 'dashed'
                    : (drawn.style?.lineStyle ?? styleVariant(look.styleSet, drawn.style?.tone).borderStyle)
                }
              />
              <Component {...props} node={drawn} editing={editing} onOpen={onOpen} />
            </div>
          ) : (
            <Component {...props} node={drawn} editing={editing} onOpen={onOpen} />
          )}
          {(framed || selected) &&
            circled && (
              // Inside the frame, which clips: the circle the shape fits, as wide as the frame's shorter side.
              <div
                aria-hidden
                className='absolute top-1/2 left-1/2 -translate-1/2 aspect-square rounded-full border-solid border-focus/40 pointer-events-none'
                style={{ height: Math.min(bounds.width, bounds.height), borderWidth: hairline }}
              />
            )}
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
              ...nodeOpacity(drawn, fade),
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

type SilhouetteProps = {
  outline: NonNullable<NodeDef['silhouette']>;
  /** False for an open outline, which has no inside to fill. */
  filled: boolean;
  /** False when another layer draws the fill. */
  fill?: boolean;
  node: Node;
  border: number;
  radius: number;
  /** Solid, dashed or dotted, as a box's border would draw. */
  lineStyle?: LineStyle['lineStyle'];
};

/**
 * A frame's fill and border cut to an outline: a layer inheriting the fill and one the border colour, each masked by
 * the path (filled, then stroked), so the shape draws with every look a box has.
 */
const Silhouette = ({ outline, filled, fill = true, node, border, radius, lineStyle }: SilhouetteProps) => {
  const { width, height } = node.size;
  const dash = dashArray(lineStyle, border);
  const masks = useMemo(() => {
    const path = outline(node, border / 2, radius);
    const image = (body: string) =>
      `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>${body}</svg>`,
      )}")`;
    return {
      fill: image(`<path d='${path}' fill='white'/>`),
      stroke: image(
        `<path d='${path}' fill='none' stroke='white' stroke-width='${border}'${dash ? ` stroke-dasharray='${dash}' stroke-linecap='round'` : ''}/>`,
      ),
    };
  }, [outline, node, width, height, border, radius, dash]);
  const layer: CSSProperties = { maskSize: '100% 100%', maskRepeat: 'no-repeat' };
  return (
    <>
      {filled && fill && (
        <div
          aria-hidden
          className='dx-cover pointer-events-none'
          style={{ ...layer, backgroundColor: 'inherit', maskImage: masks.fill }}
        />
      )}
      {/* Border all the way in, so the whole layer is the border colour. */}
      <div
        aria-hidden
        className='dx-cover box-border border-solid pointer-events-none'
        style={{
          ...layer,
          borderColor: 'inherit',
          borderWidth: `${height / 2}px ${width / 2}px`,
          maskImage: masks.stroke,
        }}
      />
    </>
  );
};

type SilhouetteReliefProps = {
  outline: NonNullable<NodeDef['silhouette']>;
  node: Node;
  border: number;
  radius: number;
  relief: SoftRelief;
  className?: string;
  /** Position, rotation and fade, as the frame's. */
  style: CSSProperties;
};

const SHADE_FLOOD: CSSProperties = { floodColor: `var(${SOFT_VARS.shade})` };
const HIGHLIGHT_FLOOD: CSSProperties = { floodColor: `var(${SOFT_VARS.highlight})` };

/**
 * A silhouette's soft relief, which its masked layers cannot cast: the outline in the ground colour under one filter of
 * two blurred, offset copies of its alpha, as the box-shadow a box draws with. Raised, the copies fall outside the shape
 * behind the frame; inset, they fall inside it over this layer's own fill.
 */
const SilhouetteRelief = ({ outline, node, border, radius, relief, className, style }: SilhouetteReliefProps) => {
  const id = useId();
  const { width, height } = node.size;
  const path = useMemo(() => outline(node, border / 2, radius), [outline, node, border, radius]);
  const { offset, blur } = SOFT_RELIEF[relief];
  // Box-shadow blur is twice the Gaussian deviation.
  const deviation = blur / 2;
  const pad = offset + blur * 2;
  const inset = relief === 'inset';
  const copy = (dx: number, flood: CSSProperties, name: string) => (
    <>
      <feOffset in='blur' dx={dx} dy={dx} result={`${name}-at`} />
      <feFlood style={flood} />
      <feComposite in2={`${name}-at`} operator='in' result={inset ? `${name}-all` : name} />
      {inset && <feComposite in={`${name}-all`} in2='SourceAlpha' operator='in' result={name} />}
    </>
  );
  return (
    <svg
      aria-hidden
      className={mx('absolute overflow-visible pointer-events-none', className)}
      width={width}
      height={height}
      style={style}
    >
      <defs>
        <filter
          id={id}
          filterUnits='userSpaceOnUse'
          x={-pad}
          y={-pad}
          width={width + pad * 2}
          height={height + pad * 2}
        >
          {inset ? (
            <>
              {/* The outside of the shape, so its shadow falls on the inner walls. */}
              <feComponentTransfer in='SourceAlpha' result='outside'>
                <feFuncA type='table' tableValues='1 0' />
              </feComponentTransfer>
              <feGaussianBlur in='outside' stdDeviation={deviation} result='blur' />
            </>
          ) : (
            <feGaussianBlur in='SourceAlpha' stdDeviation={deviation} result='blur' />
          )}
          {copy(-offset, HIGHLIGHT_FLOOD, 'highlight')}
          {copy(offset, SHADE_FLOOD, 'shade')}
          <feMerge>
            {inset ? (
              <>
                <feMergeNode in='SourceGraphic' />
                <feMergeNode in='shade' />
                <feMergeNode in='highlight' />
              </>
            ) : (
              <>
                <feMergeNode in='highlight' />
                <feMergeNode in='shade' />
                <feMergeNode in='SourceGraphic' />
              </>
            )}
          </feMerge>
        </filter>
      </defs>
      <path d={path} className={SOFT_CANVAS_FILL} filter={`url(#${id})`} />
    </svg>
  );
};

/** The node's own opacity (its style's, over its class's) under any fade the layer applies; nothing when opaque. */
const DIMMED: CSSProperties = { opacity: 0.5 };

const nodeOpacity = (node: Node, fade: CSSProperties | undefined): CSSProperties | undefined => {
  const opacity = node.style?.opacity;
  if (opacity === undefined || opacity >= 1) {
    return undefined;
  }
  const faded = typeof fade?.opacity === 'number' ? fade.opacity : 1;
  return { opacity: Math.max(0, opacity) * faded };
};

/** A node of a `bare` type: no fill or border unless its style sets them. */
const bareNode = (node: Node, bare: boolean | undefined): Node =>
  bare ? { ...node, style: { fill: false, border: false, ...node.style } } : node;

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
      // `DEFAULT_FONT_SIZE`, as a static class so Tailwind generates it.
      sizeClass(node, 'text-[24px]'),
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

export const CloudNodeView = LabelNodeView;

export const PolygonNodeView = LabelNodeView;

export const PolylineNodeView = LabelNodeView;

/** A node whose type the registry does not know: its frame and type name, so the scene still reads. */
export const UnknownNodeView = ({ node }: Pick<NodeViewProps, 'node'>) => (
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
        TEXT_LINES,
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
export const ViewNodeView = (props: NodeViewProps) => {
  const { node, store, registry, zoom, depth, liveDepth, opening, editing, onOpen } = props;
  const child = useAtomValue(store.view(isViewNode(node) ? node.scene : ''));
  const contents = opening || (isViewNode(node) && showsContents(node));
  // Being entered, the portal is already the child scene on the canvas: live.
  const tier = !child ? 'dot' : opening ? 'live' : tierFor(node, zoom, depth, liveDepth);
  const bounds = useMemo(() => (child ? portalFrame(node, contentBounds(child)) : undefined), [node, child]);
  // A scene named by no one shows no title, rather than its id.
  const title = (isViewNode(node) ? node.label : undefined) ?? child?.name ?? '';
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

/**
 * A composite object's instance: the composite scene, with the instance's overrides, scaled into the frame
 * (ANIMATION.md §4.1). The nested layer is read-only; the instance is selected and moved as one node.
 */
export const InstanceNodeView = ({ node, store, registry, zoom, depth, liveDepth }: NodeViewProps) => {
  const composite = useAtomValue(store.view(isInstanceNode(node) ? node.composite : ''));
  const drawn = useMemo(
    () => (composite && isInstanceNode(node) ? instanceView(node, composite) : undefined),
    [node, composite],
  );
  const bounds = nodeBounds(node);
  const transform = useMemo(
    () =>
      drawn && isInstanceNode(node)
        ? instanceTransform(bounds, nodeFrame(node) ?? compositeBounds(drawn), node.fit)
        : undefined,
    // Keyed on the geometry rather than the bounds object, which is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawn, node, bounds.x, bounds.y, bounds.width, bounds.height],
  );
  if (!drawn || !transform) {
    return <UnknownNodeView node={node} />;
  }
  return (
    <div
      className='absolute pointer-events-none'
      style={{
        // Out by the frame's border, so the composite's coordinates map onto the node's corner (as a portal's do).
        top: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
        left: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
        transform: `translate(${transform.offset.x - bounds.x}px, ${transform.offset.y - bounds.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
      }}
      data-instance={node.id}
    >
      <SceneLayer
        store={store}
        scene={drawn}
        registry={registry}
        zoom={zoom * transform.scale}
        depth={depth + 1}
        liveDepth={liveDepth}
      />
    </div>
  );
};

/**
 * A diagram shape as the diagram's SVG renderer draws it, in scene coordinates mapped onto the frame; while its label
 * is edited the renderer leaves the text out and the in-place editor shows it instead.
 */
export const DiagramNodeView = ({ node, editing }: NodeViewProps) => {
  const markup = useMemo(
    () => (isDiagramNode(node) ? diagramNodeMarkup(node, { hideLabel: editing !== undefined }) : []),
    [node, editing],
  );
  if (!isDiagramNode(node)) {
    return null;
  }
  const { x, y, width, height } = nodeBounds(node);
  return (
    <>
      <svg
        className='absolute overflow-visible pointer-events-none'
        style={{
          top: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
          left: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
        }}
        width={width}
        height={height}
        viewBox={`${x} ${y} ${width} ${height}`}
        data-diagram-node={node.id}
      >
        <g className={SvgFile.ROOT_CLASS}>{markup.map((element, index) => renderMarkup(element, index))}</g>
      </svg>
      {editing && <LabelPart node={node} editing={editing} label={node.label ?? ''} />}
    </>
  );
};

/** Vector art: the node's path, scaled from its `viewBox` to the frame and filled with its text colour. */
export const PathNodeView = ({ node }: NodeViewProps) => {
  if (!isPathNode(node)) {
    return null;
  }
  const { x, y, width, height } = node.viewBox;
  return (
    <svg
      className='absolute overflow-visible pointer-events-none'
      style={{
        top: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
        left: `calc(-1 * var(${FRAME_BORDER}, 2px))`,
      }}
      width={node.size.width}
      height={node.size.height}
      viewBox={`${x} ${y} ${width} ${height}`}
      preserveAspectRatio='none'
    >
      <path d={node.d} fill={node.fill ?? 'currentColor'} fillRule='evenodd' />
    </svg>
  );
};

export type OpenControlProps = { label?: string; onOpen: () => void };

/** The open control at a frame's top-right; it takes the press, so it neither drags nor selects the node. */
export const OpenControl = ({ label = 'Open view', onOpen }: OpenControlProps) => (
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
