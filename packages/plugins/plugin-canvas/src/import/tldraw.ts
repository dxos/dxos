//
// Copyright 2026 DXOS.org
//

//
// Maps a tldraw document (the records plugin-tldraw keeps in `Drawing.Canvas.content`) to canvas Views. Pure and
// React-free so it runs in an operation on any host. A group becomes what the canvas's Group command makes (an
// anonymous Object and its Instance), so arrows bound into it stay attached through the Instance's ports.
//

import * as Schema from 'effect/Schema';

import {
  DEFAULT_LAYER,
  type Intent,
  type View,
  type ViewMap,
  between,
  composeSelection,
  initialKeys,
} from '@dxos/react-ui-canvas/headless';
import {
  type BuiltinNode,
  type CloudNode,
  type EllipseNode,
  Endpoint,
  type HorizontalAlign,
  type Layer,
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
  type RectNode,
  STYLE_HUES,
  type StyleHue,
  type ViewId,
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

/** The canvas Views a tldraw document maps to, with what the mapping could not carry over. */
export type TldrawImport = {
  root: ViewId;
  views: ViewMap;
  /** Shapes left out, by tldraw shape type (and `page` for shapes on any page after the first). */
  skipped: Record<string, number>;
  /** Shapes carried over with a loss, by reason (`rotation`, `geo:<kind>`, `group`, …). */
  approximated: Record<string, number>;
};

export type TldrawImportOptions = {
  /** The root View's id; the canvas's default root by default. */
  root?: ViewId;
  /**
   * Snap every node's position and size, and every free link end, to the grid the canvas shows (`MAJOR_GRID`, the
   * cell moves and resizes snap to), so the shapes line up as ones drawn on the canvas do; on by default.
   */
  snap?: boolean;
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

/** A View under construction: its id and its elements in paint order (bottom first). */
type Draft = {
  id: ViewId;
  name?: string;
  elements: Array<Node | PendingLink>;
  /** The nodes tldraw frames became, drawn on the frames layer under everything else. */
  frames: Set<string>;
};

/** Where a View's frames go: below the content layer, so a frame reads as the backdrop its shapes sit on. */
const FRAMES_LAYER: Layer = { id: 'frames', name: 'Frames', z: between(undefined, DEFAULT_LAYER.z) };

/** An element built once every node is known, since an arrow binds to shapes anywhere in the document. */
type PendingLink = { pending: true; build: (resolve: Resolver) => Link[] };

/** Where a shape landed: its View and node id, if it became a node. */
type Resolver = (shapeId: string, view: ViewId) => string | undefined;

/** A rigid transform from a shape's parent space into its View's space. */
type Transform = { x: number; y: number; rotation: number };

const IDENTITY: Transform = { x: 0, y: 0, rotation: 0 };

/**
 * Maps a tldraw document's records to canvas Views: the first page becomes the root View. tldraw has no nested scenes,
 * so a frame becomes a labelled rectangle on a frames layer under the content, with its shapes beside it in the same
 * View, where arrows into and out of the frame stay bound.
 */
export const tldrawToViews = (
  content: Readonly<Record<string, unknown>>,
  { root = ROOT_VIEW_ID, snap = true }: TldrawImportOptions = {},
): TldrawImport => {
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

  const drafts: Draft[] = [];
  /** Shape id → the View and node it became. */
  const placed = new Map<string, { view: ViewId; node: string }>();
  /** Groups, innermost first, so an inner group's Instance is a member of the outer one. */
  const groups: Array<{ view: ViewId; id: string; members: string[] }> = [];

  const visit = (shape: ShapeRecord, draft: Draft, transform: Transform) => {
    const local = toView(transform, shape);
    const id = nodeId(shape.id);
    // The canvas turns a node clockwise about its centre, in degrees; `centerOf` already places the turned centre.
    const degrees = round(((local.rotation * 180) / Math.PI) % 360);
    const rotation = degrees === 0 ? {} : { rotation: degrees };
    const add = (node: BuiltinNode) => {
      draft.elements.push(node);
      placed.set(shape.id, { view: draft.id, node: node.id });
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
        draft.frames.add(id);
        // A frame's children are placed in its space, as a group's are.
        for (const grandchild of children.get(shape.id) ?? []) {
          visit(grandchild, draft, local);
        }
        break;
      }

      case 'group': {
        const members = children.get(shape.id) ?? [];
        for (const member of members) {
          visit(member, draft, local);
        }
        // Only a group holding a node becomes an Object; arrows bound to it then attach to its Instance.
        if (members.some((member) => placed.get(member.id)?.view === draft.id)) {
          groups.push({ view: draft.id, id, members: members.map((member) => member.id) });
          placed.set(shape.id, { view: draft.id, node: id });
        }
        break;
      }

      case 'arrow': {
        const view = draft.id;
        const terminal =
          (name: 'start' | 'end') =>
          (resolve: Resolver): Endpoint => {
            const bound = boundTo.get(`${shape.id} ${name}`) ?? legacyBound(shape.props[name]);
            const node = bound ? resolve(bound, view) : undefined;
            return node ? { node } : { point: apply(local, vec(shape.props[name])) };
          };
        const start = terminal('start');
        const end = terminal('end');
        draft.elements.push({
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
        draft.elements.push({ pending: true, build: () => links });
        break;
      }

      default:
        count(skipped, shape.type);
    }
  };

  const [page, ...otherPages] = pages;
  const rootDraft: Draft = { id: root, elements: [], frames: new Set() };
  drafts.unshift(rootDraft);
  if (page) {
    for (const shape of children.get(page.id) ?? []) {
      visit(shape, rootDraft, IDENTITY);
    }
  }
  for (const other of otherPages) {
    const dropped = descendants(children, other.id);
    if (dropped > 0) {
      count(skipped, 'page', dropped);
    }
  }

  const resolve: Resolver = (shapeId, view) => {
    const target = placed.get(shapeId);
    return target && target.view === view ? target.node : undefined;
  };

  const views: Record<ViewId, View> = {};
  for (const draft of drafts) {
    const elements = draft.elements.flatMap((element): Array<Node | Link> =>
      'pending' in element ? element.build(resolve) : [element],
    );
    const keys = initialKeys(elements.length);
    const nodes: Record<string, Node> = {};
    const links: Record<string, Link> = {};
    elements.forEach((element, index) => {
      const z = keys[index];
      if ('source' in element) {
        links[element.id] = { ...element, z };
      } else {
        nodes[element.id] = { ...element, z };
      }
    });
    // Frames go on their own layer, so every element names its layer: one naming none is on the bottom one.
    const layered =
      (layer: string) =>
      <T extends Node | Link>(element: T): T => ({ ...element, layer });
    const view: View =
      draft.frames.size === 0
        ? { id: draft.id, ...(draft.name ? { name: draft.name } : {}), nodes, links }
        : {
            id: draft.id,
            ...(draft.name ? { name: draft.name } : {}),
            nodes: Object.fromEntries(
              Object.entries(nodes).map(([id, node]) => [
                id,
                layered(draft.frames.has(id) ? FRAMES_LAYER.id : DEFAULT_LAYER.id)(node),
              ]),
            ),
            links: Object.fromEntries(Object.entries(links).map(([id, link]) => [id, layered(DEFAULT_LAYER.id)(link)])),
            layers: { [FRAMES_LAYER.id]: FRAMES_LAYER, [DEFAULT_LAYER.id]: DEFAULT_LAYER },
          };
    views[draft.id] = snap ? snapView(view, MAJOR_GRID) : view;
  }

  // A group becomes what the canvas's Group command makes: an anonymous Object, placed by one Instance.
  for (const group of groups) {
    const view = views[group.view];
    const members = group.members.flatMap((member) => {
      const target = placed.get(member);
      return target && target.view === group.view && target.node !== group.id ? [target.node] : [];
    });
    const composition = composeSelection(view, members, {
      compositeId: `${group.id}-object`,
      instanceId: group.id,
      anonymous: true,
    });
    if (composition) {
      views[composition.composite.id] = composition.composite;
      // The Instance paints where its lowest member did, not on top.
      const z = members.map((member) => view.nodes[member].z).sort()[0];
      views[group.view] = composition.intents.reduce((next, intent) => applyIntent(next, intent, z), view);
    }
  }

  return { root, views, skipped, approximated };
};

/**
 * `view` with its nodes' frames and its free link ends on a grid of `unit` px, each frame keeping at least one cell. A
 * tldraw frame grows out to the grid, so it still holds its shapes once they are snapped.
 */
const snapView = (view: View, unit: number): View => {
  const toGrid = (value: number) => Math.round(value / unit) * unit;
  const snapPoint = (point: Point): Point => ({ x: toGrid(point.x), y: toGrid(point.y) });
  const snapEnd = (end: Link['source']): Link['source'] => ('point' in end ? { point: snapPoint(end.point) } : end);
  const nodes = Object.fromEntries(
    Object.entries(view.nodes).map(([id, node]): [string, Node] => {
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
    Object.entries(view.links).map(([id, link]): [string, Link] => [
      id,
      { ...link, source: snapEnd(link.source), target: snapEnd(link.target) },
    ]),
  );
  return { ...view, nodes, links };
};

/** Applies the intents `composeSelection` returns: the Instance's creation, re-attached links, the moved members' removal. */
const applyIntent = (view: View, intent: Intent, z: string): View => {
  switch (intent.kind) {
    case 'create':
      return { ...view, nodes: { ...view.nodes, [intent.node.id]: { ...intent.node, z } } };
    case 'update': {
      const link = view.links[intent.id];
      const { source, target } = intent.values;
      return link
        ? {
            ...view,
            links: {
              ...view.links,
              [intent.id]: {
                ...link,
                ...(isEndpoint(source) ? { source } : {}),
                ...(isEndpoint(target) ? { target } : {}),
              },
            },
          }
        : view;
    }
    case 'delete': {
      const ids = new Set(intent.ids);
      return {
        ...view,
        nodes: Object.fromEntries(Object.entries(view.nodes).filter(([id]) => !ids.has(id))),
        links: Object.fromEntries(Object.entries(view.links).filter(([id]) => !ids.has(id))),
      };
    }
    default:
      return view;
  }
};

//
// Geometry.
//

/** The shape's own transform in View space: its parent's transform applied to its position and rotation. */
const toView = (parent: Transform, shape: ShapeRecord): Transform => {
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
