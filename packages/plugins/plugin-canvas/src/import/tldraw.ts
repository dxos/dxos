//
// Copyright 2026 DXOS.org
//

//
// Maps a tldraw document (the records plugin-tldraw keeps in `Drawing.Canvas.content`) to the 2D layout of Element2Ds
// and the create intents a `Canvas` takes. Pure and React-free so it runs in an operation on any host. A group becomes
// what the canvas's Group command makes (an anonymous composite and the element placing it), so arrows bound into it
// stay attached through the placing element's ports.
//

import * as Schema from 'effect/Schema';

import { DEFAULT_LAYER, between, initialKeys } from '@dxos/react-ui-canvas/headless';
import {
  type Bounds,
  type BuiltinNode,
  type CloudNode,
  type ElementEndpoint,
  type EllipseNode,
  Endpoint,
  type HorizontalAlign,
  type InstanceNode,
  type Layer,
  type LayoutIntent,
  type LineStyle,
  type Link,
  type LinkEnds,
  MAJOR_GRID,
  type Marker,
  type Node,
  type NodeStyle,
  type NodeTone,
  type NoteNode,
  type Point,
  type PolygonNode,
  type Port,
  type RectNode,
  type Scene,
  type Side,
  STYLE_HUES,
  type StyleHue,
  endpointNode,
} from '@dxos/scene';

import { ROOT_VIEW_ID } from '../model/content.ts';

//
// tldraw records (v3), read loosely: only the fields the mapper uses are checked.
//

const Props = Schema.Record(Schema.String, Schema.Unknown);
type Props = Schema.Schema.Type<typeof Props>;

const ShapeRecord = Schema.Struct({
  typeName: Schema.Literal('shape'),
  id: Schema.String,
  type: Schema.String,
  parentId: Schema.String,
  index: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  rotation: Schema.optional(Schema.Number),
  props: Props,
});
type ShapeRecord = Schema.Schema.Type<typeof ShapeRecord>;

const PageRecord = Schema.Struct({ typeName: Schema.Literal('page'), id: Schema.String, index: Schema.String });

const ArrowBinding = Schema.Struct({
  typeName: Schema.Literal('binding'),
  fromId: Schema.String,
  toId: Schema.String,
  props: Schema.Struct({ terminal: Schema.Literals(['start', 'end']) }),
});

const Vec = Schema.Struct({ x: Schema.Number, y: Schema.Number });
const LinePoint = Schema.Struct({ index: Schema.String, x: Schema.Number, y: Schema.Number });

/** A pre-3.0 arrow terminal that names the shape it is bound to inline. */
const LegacyBoundTerminal = Schema.Struct({ type: Schema.Literal('binding'), boundShapeId: Schema.String });

const isShapeRecord = Schema.is(ShapeRecord);
const isPageRecord = Schema.is(PageRecord);
const isArrowBinding = Schema.is(ArrowBinding);
const isVec = Schema.is(Vec);
const isLinePoint = Schema.is(LinePoint);
const isLegacyBoundTerminal = Schema.is(LegacyBoundTerminal);
const isEndpoint = Schema.is(Endpoint);

//
// Result.
//

export type TldrawImportOptions = {
  /** The page layout's key; the canvas's default root by default. */
  root?: string;
  /**
   * Snap every shape's position and size, and every free link end, to the grid the canvas shows (`MAJOR_GRID`, the
   * cell moves and resizes snap to), so the shapes line up as ones drawn on the canvas do; on by default.
   */
  snap?: boolean;
};

/** A tldraw document as a `Canvas` takes it: its first page as a 2D layout of Element2Ds, created by intents. */
export type TldrawLayout = {
  /** The first page. */
  layout: Scene.LayoutRecord2D;
  /** The composite layouts its groups place, and the objects that place them. */
  parts: Scene.LayoutRecord2D[];
  objects: Scene.Object2D[];
  /** One create per element of the page, the shapes before the links bound to them. */
  intents: LayoutIntent[];
  /** Shapes left out, by tldraw shape type (and `page` for shapes on any page after the first). */
  skipped: Record<string, number>;
  /** Shapes carried over with a loss, by reason (`rotation`, `geo:<kind>`, `group`, …). */
  approximated: Record<string, number>;
};

//
// tldraw style tables (light theme, tldraw 3.0).
//

/** tldraw's `DefaultColorThemePalette` solid colours. */
const TLDRAW_COLORS: Record<string, string> = {
  'black': '#1d1d1d',
  'grey': '#9fa8b2',
  'light-violet': '#e085f4',
  'violet': '#ae3ec9',
  'blue': '#4465e9',
  'light-blue': '#4ba1f1',
  'yellow': '#f1ac4b',
  'orange': '#e16919',
  'green': '#099268',
  'light-green': '#4cb05e',
  'light-red': '#f87777',
  'red': '#e03131',
  'white': '#ffffff',
};

/** The theme hues' 500 shades, which the nearest tldraw colour is matched against. */
const HUE_COLORS: Record<StyleHue, string> = {
  neutral: '#737373',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  green: '#22c55e',
  teal: '#14b8a6',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  violet: '#8b5cf6',
};

/** Text shape font sizes by tldraw `size`. */
const FONT_SIZES: Record<string, number> = { s: 18, m: 24, l: 36, xl: 44 };

/** Label font sizes (geo, note, arrow) by tldraw `size`. */
const LABEL_FONT_SIZES: Record<string, number> = { s: 18, m: 22, l: 26, xl: 32 };

/** tldraw's sticky note side. */
const NOTE_SIZE = 200;

/** Line height of tldraw's text, as a multiple of the font size. */
const LINE_HEIGHT = 1.35;

/** tldraw's polygon geos, by the sides of the regular polygon the canvas draws. */
const POLYGON_SIDES: Readonly<Record<string, number>> = { triangle: 3, pentagon: 5, hexagon: 6, octagon: 8 };

//
// Mapper.
//

/** A shape or link the page will hold, in the canvas's node vocabulary until it is written as its element. */
type Drawn = Node | Link;

/** A link built once every shape is known, since an arrow binds to shapes anywhere in the document. */
type PendingLink = { pending: true; build: (resolve: Resolver) => Link[] };

/** The node a shape became, if it became one. */
type Resolver = (shapeId: string) => string | undefined;

/** A layout under construction: its nodes and links by id, in paint order, and its layers when it names them. */
type Draft = {
  nodes: Record<string, Node>;
  links: Record<string, Link>;
  layers?: Record<string, Layer>;
};

/** Where a page's frames go: below the content layer, so a frame reads as the backdrop its shapes sit on. */
const FRAMES_LAYER: Layer = { id: 'frames', name: 'Frames', z: between(undefined, DEFAULT_LAYER.z) };

/** A rigid transform from a shape's parent space into the page's space. */
type Transform = { x: number; y: number; rotation: number };

const IDENTITY: Transform = { x: 0, y: 0, rotation: 0 };

/** The object a placing element names for the composite `parts`, as the canvas names a placed composite's. */
const objectId = (parts: string) => `instance:${parts}`;

/**
 * Maps a tldraw document to 2D layouts: its first page becomes the layout `root`. tldraw has no nested scenes, so a
 * frame becomes a labelled rectangle on a frames layer under the content, with its shapes beside it in the same layout,
 * where arrows into and out of the frame stay bound. Each element is the one the canvas engine writes for a shape drawn
 * there, so an imported shape edits as a drawn one does.
 */
export const tldrawToLayout = (
  content: Readonly<Record<string, unknown>>,
  { root = ROOT_VIEW_ID, snap = true }: TldrawImportOptions = {},
): TldrawLayout => {
  const records = Object.values(content);
  const shapes = records.filter(isShapeRecord);
  /** `<arrow id> <terminal>` → the shape that end is bound to; the first binding wins, as a lookup per end. */
  const boundTo = new Map<string, string>();
  for (const binding of records.filter(isArrowBinding)) {
    const key = `${binding.fromId} ${binding.props.terminal}`;
    if (!boundTo.has(key)) {
      boundTo.set(key, binding.toId);
    }
  }
  const pages = records.filter(isPageRecord).sort(byIndex);

  const children = new Map<string, ShapeRecord[]>();
  for (const shape of shapes) {
    const siblings = children.get(shape.parentId);
    if (siblings) {
      siblings.push(shape);
    } else {
      children.set(shape.parentId, [shape]);
    }
  }
  for (const list of children.values()) {
    list.sort(byIndex);
  }

  const skipped: Record<string, number> = {};
  const approximated: Record<string, number> = {};
  const count = (target: Record<string, number>, key: string, by = 1) => {
    target[key] = (target[key] ?? 0) + by;
  };

  /** The page's elements in paint order (bottom first). */
  const drawn: Array<Drawn | PendingLink> = [];
  /** The nodes tldraw frames became, drawn on the frames layer under everything else. */
  const frames = new Set<string>();
  /** Shape id → the node it became. */
  const placed = new Map<string, string>();
  /** Groups, innermost first, so an inner group's placing element is a member of the outer one. */
  const groups: Array<{ id: string; members: string[] }> = [];

  const visit = (shape: ShapeRecord, transform: Transform) => {
    const local = toPage(transform, shape);
    const id = nodeId(shape.id);
    // The canvas turns a node clockwise about its centre, in degrees; `centerOf` already places the turned centre.
    const degrees = round(((local.rotation * 180) / Math.PI) % 360);
    const rotation = degrees === 0 ? {} : { rotation: degrees };
    const add = (node: BuiltinNode) => {
      drawn.push(node);
      placed.set(shape.id, node.id);
    };

    switch (shape.type) {
      case 'geo': {
        const geo = str(shape.props, 'geo', 'rectangle');
        const sides = POLYGON_SIDES[geo];
        // A canvas polygon is regular, so tldraw's stretched polygons are approximations too.
        if (geo !== 'rectangle' && geo !== 'ellipse' && geo !== 'oval' && geo !== 'cloud') {
          count(approximated, `geo:${geo}`);
        }
        const size = {
          width: num(shape.props, 'w', 0),
          height: num(shape.props, 'h', 0) + num(shape.props, 'growY', 0),
        };
        const base = {
          id,
          z: '',
          center: centerOf(local, size),
          size,
          ...rotation,
          ...withStyle(shapeStyle(shape.props, LABEL_FONT_SIZES)),
          ...withLabel(shape.props),
        };
        add(
          geo === 'ellipse' || geo === 'oval'
            ? ({ ...base, type: 'ellipse' } satisfies EllipseNode)
            : geo === 'cloud'
              ? ({ ...base, type: 'cloud' } satisfies CloudNode)
              : sides !== undefined
                ? ({ ...base, type: 'polygon', params: { sides } } satisfies PolygonNode)
                : ({ ...base, type: 'rect' } satisfies RectNode),
        );
        break;
      }

      case 'note': {
        const scale = num(shape.props, 'scale', 1);
        const size = { width: NOTE_SIZE * scale, height: (NOTE_SIZE + num(shape.props, 'growY', 0)) * scale };
        // A sticky is filled by default, so its fill style is not read.
        const { tone: _tone, ...style } = shapeStyle(shape.props, LABEL_FONT_SIZES);
        add({
          type: 'rect',
          id,
          z: '',
          center: centerOf(local, size),
          size,
          ...rotation,
          ...withStyle(style),
          ...withLabel(shape.props),
        } satisfies RectNode);
        break;
      }

      case 'text': {
        const scale = num(shape.props, 'scale', 1);
        const text = str(shape.props, 'text', '');
        const fontSize = (FONT_SIZES[str(shape.props, 'size', 'm')] ?? FONT_SIZES.m) * scale;
        const lines = Math.max(1, text.split('\n').length);
        const size = { width: num(shape.props, 'w', 0) * scale, height: Math.round(lines * fontSize * LINE_HEIGHT) };
        const { tone: _tone, ...style } = shapeStyle(shape.props, FONT_SIZES, scale);
        const align = str(shape.props, 'textAlign', str(shape.props, 'align', 'start'));
        add({
          type: 'note',
          id,
          z: '',
          center: centerOf(local, size),
          size,
          ...rotation,
          text,
          ...withStyle({ ...style, ...(align === 'start' ? {} : { alignHorizontal: horizontal(align) }) }),
        } satisfies NoteNode);
        break;
      }

      case 'frame': {
        const size = { width: num(shape.props, 'w', 0), height: num(shape.props, 'h', 0) };
        const name = str(shape.props, 'name', '');
        add({
          type: 'rect',
          id,
          z: '',
          center: centerOf(local, size),
          size,
          ...rotation,
          ...(name ? { label: name } : {}),
          // An outline with its name in the corner, as tldraw draws a frame, clear of the shapes inside.
          style: { tone: 0, alignHorizontal: 'left', alignVertical: 'top' },
        } satisfies RectNode);
        frames.add(id);
        // A frame's children are placed in its space, as a group's are.
        for (const grandchild of children.get(shape.id) ?? []) {
          visit(grandchild, local);
        }
        break;
      }

      case 'group': {
        const members = children.get(shape.id) ?? [];
        for (const member of members) {
          visit(member, local);
        }
        // Only a group holding a node becomes a composite; arrows bound to it then attach to its placing element.
        if (members.some((member) => placed.has(member.id))) {
          groups.push({ id, members: members.map((member) => member.id) });
          placed.set(shape.id, id);
        }
        break;
      }

      case 'arrow': {
        const terminal =
          (name: 'start' | 'end') =>
          (resolve: Resolver): Endpoint => {
            const bound = boundTo.get(`${shape.id} ${name}`) ?? legacyBound(shape.props[name]);
            const node = bound ? resolve(bound) : undefined;
            return node ? { node } : { point: apply(local, vec(shape.props[name])) };
          };
        const start = terminal('start');
        const end = terminal('end');
        drawn.push({
          pending: true,
          build: (resolve) => [
            {
              type: num(shape.props, 'bend', 0) === 0 ? 'line' : 'curve',
              id,
              z: '',
              source: start(resolve),
              target: end(resolve),
              ...withEnds(shape.props),
              ...withText(shape.props),
              ...withStyle(lineStyle(shape.props)),
            },
          ],
        });
        break;
      }

      case 'line': {
        const points = Object.values(asRecord(shape.props.points))
          .filter(isLinePoint)
          .sort(byIndex)
          .map((point) => apply(local, point));
        if (points.length < 2) {
          count(skipped, 'line');
          break;
        }
        const style = withStyle(lineStyle(shape.props));
        const ends = (index: number) => ({ source: { point: points[index] }, target: { point: points[index + 1] } });
        // A straight polyline becomes a chain of line links; a cubic one, a single spline through its points.
        const links: Link[] =
          str(shape.props, 'spline', 'line') === 'cubic' && points.length > 2
            ? [
                {
                  type: 'spline',
                  id,
                  z: '',
                  source: { point: points[0] },
                  target: { point: points[points.length - 1] },
                  points: points.slice(1, -1),
                  ...style,
                },
              ]
            : points.slice(1).map((_, index) => ({
                type: 'line' as const,
                id: index === 0 ? id : `${id}-${index}`,
                z: '',
                ...ends(index),
                ...style,
              }));
        drawn.push({ pending: true, build: () => links });
        break;
      }

      default:
        count(skipped, shape.type);
    }
  };

  const [page, ...otherPages] = pages;
  if (page) {
    for (const shape of children.get(page.id) ?? []) {
      visit(shape, IDENTITY);
    }
  }
  for (const other of otherPages) {
    const dropped = descendants(children, other.id);
    if (dropped > 0) {
      count(skipped, 'page', dropped);
    }
  }

  const resolve: Resolver = (shapeId) => placed.get(shapeId);
  const elements = drawn.flatMap((element): Drawn[] => ('pending' in element ? element.build(resolve) : [element]));
  const keys = initialKeys(elements.length);
  const draft: Draft = { nodes: {}, links: {} };
  elements.forEach((element, index) => {
    const z = keys[index];
    if ('source' in element) {
      draft.links[element.id] = { ...element, z };
    } else {
      draft.nodes[element.id] = { ...element, z };
    }
  });
  // Frames go on their own layer, so every element names its layer: one naming none is on the bottom one.
  if (frames.size > 0) {
    draft.nodes = Object.fromEntries(
      Object.entries(draft.nodes).map(([id, node]) => [
        id,
        { ...node, layer: frames.has(id) ? FRAMES_LAYER.id : DEFAULT_LAYER.id },
      ]),
    );
    draft.links = Object.fromEntries(
      Object.entries(draft.links).map(([id, link]) => [id, { ...link, layer: DEFAULT_LAYER.id }]),
    );
    draft.layers = { [FRAMES_LAYER.id]: FRAMES_LAYER, [DEFAULT_LAYER.id]: DEFAULT_LAYER };
  }
  const page2d = snap ? snapDraft(draft, MAJOR_GRID) : draft;

  // A group becomes what the canvas's Group command makes: an anonymous composite, placed by one element.
  const composites: Array<{ id: string; draft: Draft }> = [];
  for (const group of groups) {
    const members = group.members.flatMap((member) => {
      const node = placed.get(member);
      return node !== undefined && node !== group.id && page2d.nodes[node] ? [node] : [];
    });
    const composite = composeGroup(page2d, members, `${group.id}-object`, group.id);
    composite && composites.push(composite);
  }

  const layout = layoutRecord(root, page2d);
  const parts = composites.map(({ id, draft }) => ({
    ...layoutRecord(id, draft),
    name: 'Object',
    kind: 'composite' as const,
    anonymous: true,
  }));
  const objects = composites.map(({ id }): Scene.Object2D => ({ id: objectId(id), type: 'rect', parts: id }));
  const ordered = Object.values(layout.elements);
  return {
    layout,
    parts,
    objects,
    // A link is created after its ends, since a create bound to a missing element is refused.
    intents: [
      ...ordered.filter((element) => element.type !== 'link'),
      ...ordered.filter((element) => element.type === 'link'),
    ].map((element) => ({ kind: 'create', element })),
    skipped,
    approximated,
  };
};

/**
 * `draft` with its nodes' frames and its free link ends on a grid of `unit` px, each frame keeping at least one cell. A
 * tldraw frame grows out to the grid, so it still holds its shapes once they are snapped.
 */
const snapDraft = (draft: Draft, unit: number): Draft => {
  const toGrid = (value: number) => Math.round(value / unit) * unit;
  const snapPoint = (point: Point): Point => ({ x: toGrid(point.x), y: toGrid(point.y) });
  const snapEnd = (end: Endpoint): Endpoint => ('point' in end ? { point: snapPoint(end.point) } : end);
  const nodes = Object.fromEntries(
    Object.entries(draft.nodes).map(([id, node]): [string, Node] => {
      const left = node.center.x - node.size.width / 2;
      const top = node.center.y - node.size.height / 2;
      const outward = node.layer === FRAMES_LAYER.id;
      const [x0, y0] = outward
        ? [Math.floor(left / unit) * unit, Math.floor(top / unit) * unit]
        : [toGrid(left), toGrid(top)];
      const width = outward
        ? Math.ceil((left + node.size.width) / unit) * unit - x0
        : Math.max(unit, toGrid(node.size.width));
      const height = outward
        ? Math.ceil((top + node.size.height) / unit) * unit - y0
        : Math.max(unit, toGrid(node.size.height));
      return [id, { ...node, center: { x: x0 + width / 2, y: y0 + height / 2 }, size: { width, height } }];
    }),
  );
  const links = Object.fromEntries(
    Object.entries(draft.links).map(([id, link]): [string, Link] => [
      id,
      { ...link, source: snapEnd(link.source), target: snapEnd(link.target) },
    ]),
  );
  return { ...draft, nodes, links };
};

//
// Groups.
//

const nodeBounds = (node: Node): Bounds => ({
  x: node.center.x - node.size.width / 2,
  y: node.center.y - node.size.height / 2,
  width: node.size.width,
  height: node.size.height,
});

const unionBounds = (list: readonly Bounds[]): Bounds | undefined => {
  if (list.length === 0) {
    return undefined;
  }
  const x = Math.min(...list.map((bounds) => bounds.x));
  const y = Math.min(...list.map((bounds) => bounds.y));
  const right = Math.max(...list.map((bounds) => bounds.x + bounds.width));
  const bottom = Math.max(...list.map((bounds) => bounds.y + bounds.height));
  return { x, y, width: right - x, height: bottom - y };
};

/** The side of `frame` that a ray from its centre through `point` leaves by, and how far along it (0 to 1). */
const sideToward = (frame: Bounds, point: Point): { side: Side; offset: number } => {
  const halfWidth = frame.width / 2 || 1;
  const halfHeight = frame.height / 2 || 1;
  const dx = (point.x - (frame.x + halfWidth)) / halfWidth;
  const dy = (point.y - (frame.y + halfHeight)) / halfHeight;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return Math.abs(dx) >= Math.abs(dy)
    ? { side: dx >= 0 ? 'e' : 'w', offset: clamp((point.y - frame.y) / (frame.height || 1)) }
    : { side: dy >= 0 ? 's' : 'n', offset: clamp((point.x - frame.x) / (frame.width || 1)) };
};

/** Where a composite point lands in `frame` when the placing element fits the composite's `content` into it, centred. */
const fitInto = (frame: Bounds, content: Bounds | undefined): ((point: Point) => Point) => {
  const middle = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  if (!content || content.width <= 0 || content.height <= 0) {
    return (point) => ({ x: middle.x + point.x, y: middle.y + point.y });
  }
  const scale = Math.min(frame.width / content.width, frame.height / content.height);
  const offset = {
    x: middle.x - (content.x + content.width / 2) * scale,
    y: middle.y - (content.y + content.height / 2) * scale,
  };
  return (point) => ({ x: offset.x + point.x * scale, y: offset.y + point.y * scale });
};

/**
 * Groups `members` of `page` in place, as the canvas's Group command does: they and the links wholly inside the group
 * move into a new composite, re-centred on their bounds, and one element placing it replaces them, painting where the
 * lowest member did. A link crossing the group's edge stays, re-attached to the port of the placing element that the
 * inner node it left now exposes. None when the group holds no node.
 */
const composeGroup = (
  page: Draft,
  members: readonly string[],
  compositeId: string,
  instanceId: string,
): { id: string; draft: Draft } | undefined => {
  const inside = new Set(members);
  const nodes = Object.values(page.nodes).filter((node) => inside.has(node.id));
  const bounds = unionBounds(nodes.map(nodeBounds));
  if (!bounds) {
    return undefined;
  }
  const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const shiftPoint = (point: Point): Point => ({ x: point.x - centre.x, y: point.y - centre.y });
  const shiftEnd = (end: Endpoint): Endpoint => ('point' in end ? { point: shiftPoint(end.point) } : end);
  const isInside = (end: Endpoint) => {
    const node = endpointNode(end);
    return node === undefined || inside.has(node);
  };
  const touches = (link: Link) => [link.source, link.target].some((end) => inside.has(endpointNode(end) ?? ''));
  const links = Object.values(page.links).filter(touches);
  const moved = links.filter((link) => isInside(link.source) && isInside(link.target));
  const crossing = links.filter((link) => !moved.includes(link));
  // The inner node at each crossing link's inside end is exposed, so the placing element offers a port for it.
  const exposed = new Set(
    crossing.flatMap((link) => [link.source, link.target].map(endpointNode).filter((id) => id && inside.has(id))),
  );

  // Every member names its layer: the page's own, else the bottom one.
  const layers = Object.values(page.layers ?? {}).sort((left, right) => (left.z < right.z ? -1 : 1));
  const bottom = layers.length > 0 ? layers : [DEFAULT_LAYER];
  const layerOf = (element: Drawn): string =>
    element.layer !== undefined && bottom.some((layer) => layer.id === element.layer) ? element.layer : bottom[0].id;
  const childNodes = nodes.map((node): Node => ({
    ...node,
    center: shiftPoint(node.center),
    ...(exposed.has(node.id) ? { exposed: true } : {}),
    layer: layerOf(node),
  }));
  const childLinks = moved.map((link): Link => ({
    ...link,
    source: shiftEnd(link.source),
    target: shiftEnd(link.target),
    ...(link.type === 'spline' ? { points: link.points.map(shiftPoint) } : {}),
    layer: layerOf(link),
  }));
  const used = new Set([...childNodes, ...childLinks].map((element) => element.layer));
  const place = fitInto(bounds, unionBounds(childNodes.map(nodeBounds)));
  const ports: Port[] = childNodes
    .filter((node) => node.exposed)
    .map((node) => ({ id: node.id, ...sideToward(bounds, place(node.center)) }));
  const reattach = (end: Endpoint): Endpoint => {
    const node = endpointNode(end);
    return node !== undefined && inside.has(node) ? { node: instanceId, port: node } : end;
  };
  const gone = new Set([...inside, ...moved.map((link) => link.id)]);
  const instance: InstanceNode = {
    type: 'instance',
    id: instanceId,
    z: nodes.map((node) => node.z).sort()[0],
    center: centre,
    size: { width: bounds.width, height: bounds.height },
    composite: compositeId,
    ports,
  };
  page.nodes = {
    ...Object.fromEntries(Object.entries(page.nodes).filter(([id]) => !gone.has(id))),
    [instanceId]: instance,
  };
  const kept: Record<string, Link> = {};
  for (const link of Object.values(page.links)) {
    if (!gone.has(link.id)) {
      kept[link.id] = crossing.includes(link)
        ? { ...link, source: reattach(link.source), target: reattach(link.target) }
        : link;
    }
  }
  page.links = kept;
  return {
    id: compositeId,
    draft: {
      nodes: Object.fromEntries(childNodes.map((node) => [node.id, node])),
      links: Object.fromEntries(childLinks.map((link) => [link.id, link])),
      layers: Object.fromEntries(bottom.filter((layer) => used.has(layer.id)).map((layer) => [layer.id, layer])),
    },
  };
};

//
// Elements.
//

type Fields = Record<string, unknown>;

/** The node fields an element keeps in its own slots; the rest are the canvas's, under `props.canvas`. */
const NODE_SLOTS = [
  'type',
  'id',
  'z',
  'center',
  'size',
  'rotation',
  'label',
  'layer',
  'locked',
  'style',
  'class',
  'frame',
];

/** The link fields an element keeps in its own slots. */
const LINK_SLOTS = ['id', 'z', 'source', 'target', 'text', 'layer', 'locked', 'style', 'class'];

const canvasFields = (record: object, slots: readonly string[]): Fields =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !slots.includes(key)));

const elementEndpoint = (end: Endpoint): ElementEndpoint =>
  'node' in end
    ? end.port === undefined
      ? { node: end.node }
      : { node: end.node, port: end.port }
    : { point: end.point };

/** The element the canvas writes for a node: a group's placing element names its composite's object. */
const nodeElement = (node: Node): Scene.Element2D => {
  const canvas = canvasFields(node, NODE_SLOTS);
  const composite = node.type === 'instance' ? canvas.composite : undefined;
  if (typeof composite === 'string') {
    canvas.type = 'instance';
  }
  const label = Reflect.get(node, 'label');
  return {
    id: node.id,
    ...(typeof composite === 'string' ? { object: objectId(composite) } : { type: node.type }),
    z: node.z,
    center: node.center,
    size: node.size,
    ...(node.rotation !== undefined ? { rotation: node.rotation } : {}),
    ...(typeof label === 'string' ? { label } : {}),
    ...(node.layer !== undefined ? { layer: node.layer } : {}),
    ...(node.locked !== undefined ? { locked: node.locked } : {}),
    ...(node.class !== undefined ? { style: node.class } : {}),
    ...(node.style ? { overrides: node.style } : {}),
    props: { canvas },
  };
};

const linkElement = (link: Link): Scene.Element2D => ({
  id: link.id,
  type: 'link',
  z: link.z,
  source: elementEndpoint(link.source),
  target: elementEndpoint(link.target),
  ...(link.text !== undefined ? { label: link.text } : {}),
  ...(link.layer !== undefined ? { layer: link.layer } : {}),
  ...(link.locked !== undefined ? { locked: link.locked } : {}),
  ...(link.class !== undefined ? { style: link.class } : {}),
  ...(link.style ? { overrides: link.style } : {}),
  props: { canvas: canvasFields(link, LINK_SLOTS) },
});

const layoutRecord = (id: string, draft: Draft): Scene.LayoutRecord2D => ({
  id,
  dim: '2d',
  ...(draft.layers !== undefined ? { layers: draft.layers } : {}),
  elements: Object.fromEntries(
    [...Object.values(draft.nodes).map(nodeElement), ...Object.values(draft.links).map(linkElement)].map((element) => [
      element.id,
      element,
    ]),
  ),
});

//
// Geometry.
//

/** The shape's own transform in page space: its parent's transform applied to its position and rotation. */
const toPage = (parent: Transform, shape: ShapeRecord): Transform => {
  const origin = apply(parent, { x: shape.x, y: shape.y });
  return { ...origin, rotation: parent.rotation + (shape.rotation ?? 0) };
};

const apply = (transform: Transform, point: Point): Point => {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  return {
    x: round(transform.x + point.x * cos - point.y * sin),
    y: round(transform.y + point.x * sin + point.y * cos),
  };
};

/** tldraw rotates a shape about its top-left corner; the centre follows that rotation. */
const centerOf = (transform: Transform, size: { width: number; height: number }): Point =>
  apply(transform, { x: size.width / 2, y: size.height / 2 });

// `|| 0` folds a negative zero, which a rotation by a multiple of a quarter turn leaves behind.
const round = (value: number) => Math.round(value * 100) / 100 || 0;

//
// Style.
//

/**
 * The theme hue nearest a tldraw colour: neutral for a grey (black and white included), else the chromatic hue nearest
 * it around the colour wheel, since lightness is the tone's business, not the hue's.
 */
export const nearestHue = (color: string): StyleHue => {
  const hsl = toHsl(TLDRAW_COLORS[color] ?? color);
  if (!hsl || hsl.saturation < GREY_SATURATION) {
    return 'neutral';
  }
  let best: StyleHue = 'neutral';
  let distance = Infinity;
  for (const hue of STYLE_HUES) {
    const candidate = toHsl(HUE_COLORS[hue]);
    if (hue !== 'neutral' && candidate) {
      const turn = Math.abs(hsl.hue - candidate.hue);
      const next = Math.min(turn, 360 - turn);
      if (next < distance) {
        distance = next;
        best = hue;
      }
    }
  }
  return best;
};

/** Below this HSL saturation a colour reads as grey. */
const GREY_SATURATION = 0.2;

const toHsl = (value: string): { hue: number; saturation: number } | undefined => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) {
    return undefined;
  }
  const [red, green, blue] = [match[1], match[2], match[3]].map((hex) => parseInt(hex, 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  if (delta === 0) {
    return { hue: 0, saturation: 0 };
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const sector =
    max === red
      ? ((green - blue) / delta + 6) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  return { hue: sector * 60, saturation };
};

/** tldraw fill → the canvas tone: none is an outline, solid the strongest fill, semi the lightest. */
const TONES: Readonly<Record<string, NodeTone>> = { none: 0, solid: 1, fill: 1, pattern: 2, semi: 3 };

const shapeStyle = (props: Props, fontSizes: Record<string, number>, scale = 1): NodeStyle => {
  const hue = nearestHue(str(props, 'color', 'black'));
  const tone: NodeTone | undefined = TONES[str(props, 'fill', 'none')];
  const dash = str(props, 'dash', 'draw');
  const size = str(props, 'size', 'm');
  const fontSize = (fontSizes[size] ?? fontSizes.m) * scale;
  const vertical = str(props, 'verticalAlign', 'middle');
  return {
    ...(hue === 'neutral' ? {} : { hue }),
    ...(tone === undefined ? {} : { tone }),
    ...(dash === 'dashed' || dash === 'dotted' ? { lineStyle: dash } : {}),
    ...(size === 'm' && scale === 1 ? {} : { fontSize }),
    ...(str(props, 'font', 'draw') === 'mono' ? { fontFamily: 'monospace' as const } : {}),
    ...(str(props, 'align', 'middle') === 'middle'
      ? {}
      : { alignHorizontal: horizontal(str(props, 'align', 'middle')) }),
    ...(vertical === 'middle' ? {} : { alignVertical: vertical === 'start' ? 'top' : 'bottom' }),
  };
};

const lineStyle = (props: Props): LineStyle => {
  const hue = nearestHue(str(props, 'color', 'black'));
  const dash = str(props, 'dash', 'draw');
  return {
    ...(hue === 'neutral' ? {} : { hue }),
    ...(dash === 'dashed' || dash === 'dotted' ? { lineStyle: dash } : {}),
  };
};

const horizontal = (align: string): HorizontalAlign =>
  align.startsWith('start') ? 'left' : align.startsWith('end') ? 'right' : 'center';

const withStyle = <Style extends LineStyle>(style: Style) => (Object.keys(style).length > 0 ? { style } : {});

const withLabel = (props: Props) => {
  const text = str(props, 'text', '');
  return text ? { label: text } : {};
};

const withText = (props: Props) => {
  const text = str(props, 'text', '');
  return text ? { text } : {};
};

/** tldraw arrowheads the canvas draws; any other head reads as an arrow. */
const marker = (head: string): Marker | undefined =>
  head === 'none' ? undefined : head === 'triangle' ? 'triangle' : head === 'dot' ? 'circle' : 'arrow';

const withEnds = (props: Props): { ends?: LinkEnds } => {
  const start = marker(str(props, 'arrowheadStart', 'none'));
  const end = marker(str(props, 'arrowheadEnd', 'arrow'));
  return start || end ? { ends: { ...(start ? { start } : {}), ...(end ? { end } : {}) } } : {};
};

//
// Records.
//

const nodeId = (shapeId: string) => shapeId.replace(/^shape:/, '');

const byIndex = (left: { index: string }, right: { index: string }) =>
  left.index < right.index ? -1 : left.index > right.index ? 1 : 0;

const num = (props: Props, key: string, fallback: number): number => {
  const value = props[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const str = (props: Props, key: string, fallback: string): string => {
  const value = props[key];
  return typeof value === 'string' ? value : fallback;
};

const vec = (value: unknown): Point => (isVec(value) ? { x: value.x, y: value.y } : { x: 0, y: 0 });

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? Object.fromEntries(Object.entries(value)) : {};

const legacyBound = (terminal: unknown): string | undefined =>
  isLegacyBoundTerminal(terminal) ? terminal.boundShapeId : undefined;

/** How many shapes a container holds, at any depth. */
const descendants = (children: Map<string, ShapeRecord[]>, parent: string): number =>
  (children.get(parent) ?? []).reduce((sum, shape) => sum + 1 + descendants(children, shape.id), 0);
