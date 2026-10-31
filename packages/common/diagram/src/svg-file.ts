//
// Copyright 2026 DXOS.org
//

//
// A scene as SVG: the geometry, classes and markers of every element, built as plain data (`Markup`) with no React,
// so a headless caller (a CLI, a worker, a render script) writes it to a file (`serialize`) and an editor draws the
// same tree as elements (the canvas's diagram nodes and links), and the two cannot drift apart.
//

import { Shape } from '@dxos/scene';

import * as Diagnostics from './diagnostics.ts';
import * as Scene from './scene.ts';

const FONT_SIZE = (weight: Shape.Weight) => Diagnostics.LABEL_TYPE[weight].size;
const LINE_H = (weight: Shape.Weight) => Diagnostics.LABEL_TYPE[weight].lineH;

const MARGIN = 40;
const RADIUS = 8;
const CHAR_EM = Diagnostics.CHAR_EM;

export type Rect = { x: number; y: number; w: number; h: number };
type Point = Shape.Point;

/** Attribute value; `undefined` and `false` drop the attribute, as React does. */
export type Value = string | number | boolean | undefined;

/** An SVG element as data, its attributes named as in SVG; a string child is text, escaped when written. */
export type Markup = {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, Value>>;
  readonly children: readonly (Markup | string)[];
};

const escape = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

const attrs = (values: Record<string, Value>): string =>
  Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([name, value]) => ` ${name}="${escape(String(value))}"`)
    .join('');

const el = (
  tag: string,
  values: Record<string, Value>,
  children: readonly (Markup | string | undefined)[] = [],
): Markup => ({
  tag,
  attrs: values,
  children: children.filter((child): child is Markup | string => child !== undefined),
});

/** The markup as SVG text. */
export const serialize = (node: Markup | string): string =>
  typeof node === 'string'
    ? escape(node)
    : `<${node.tag}${attrs(node.attrs)}>${node.children.map(serialize).join('')}</${node.tag}>`;

const cx = (...classes: (string | undefined | false)[]): string | undefined =>
  classes.filter(Boolean).join(' ') || undefined;

const rectOf = (object: Scene.WorldObject, element: Shape.Box | Shape.Portal): Rect => {
  const { x = 0, y = 0 } = object.origin ?? {};
  const scale = object.scale ?? 1;
  return { x: x + element.x * scale, y: y + element.y * scale, w: element.w * scale, h: element.h * scale };
};

const center = (rect: Rect): Point => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

const strokeDash: Partial<Record<Shape.Stroke, string>> = { dashed: '6 4', dotted: '2 4' };

/** Greedy word wrap per input line; SVG text has no native wrapping. */
export const wrapLines = (text: string, maxChars: number): string[] =>
  text.split('\n').flatMap((line) => {
    if (line.length <= maxChars) {
      return [line];
    }
    const lines: string[] = [];
    let current = '';
    for (const word of line.split(' ')) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    return [...lines, current];
  });

/** Rect path rounding only the top or bottom corners; the opposite edge stays square. */
export const partiallyRoundedRect = ({ x, y, w, h }: Rect, cornerRadius: number, corners: 'top' | 'bottom'): string => {
  // Clamp so small rects cannot produce self-overlapping path segments.
  const radius = Math.min(cornerRadius, w / 2, h / 2);
  return corners === 'top'
    ? `M ${x} ${y + h} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} L ${x + w - radius} ${y} ` +
        `Q ${x + w} ${y} ${x + w} ${y + radius} L ${x + w} ${y + h} Z`
    : `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - radius} Q ${x + w} ${y + h} ${x + w - radius} ${y + h} ` +
        `L ${x + radius} ${y + h} Q ${x} ${y + h} ${x} ${y + h - radius} Z`;
};

/** Text (and so `currentColor`) per scene color; the group tints wash their fill from it. */
export const COLOR_CLASS: Partial<Record<Shape.Color, string>> = {
  'grey': 'text-neutral-400 dark:text-neutral-500',
  'light-blue': 'text-sky-500',
  'light-green': 'text-emerald-500',
  'yellow': 'text-amber-500',
  'light-violet': 'text-violet-500',
  'orange': 'text-orange-500',
  'light-red': 'text-rose-500',
};

const colorClass = (color?: Shape.Color) => (color ? COLOR_CLASS[color] : undefined);

const MUTED_TEXT = 'text-neutral-500 dark:text-neutral-400';

/** The exported file's light theme: what `STYLE` sets, and the plain colors the themed fills fall back to. */
const SURFACE_HEX = '#ffffff';
const INK_HEX = '#262626';
const TEXT_HEX: Record<string, string> = {
  'text-neutral-400': '#a3a3a3',
  'text-neutral-500': '#737373',
  'text-sky-500': '#0ea5e9',
  'text-emerald-500': '#10b981',
  'text-amber-500': '#f59e0b',
  'text-violet-500': '#8b5cf6',
  'text-orange-500': '#f97316',
  'text-rose-500': '#f43f5e',
};

/** Surface fill; the fallback is what renderers without custom properties (librsvg, sharp) resolve. */
const SURFACE_FILL = `var(--surface-bg, ${SURFACE_HEX})`;

const TINT_PERCENT = 10;

/** A tinted solid fill: a light wash of the shape's color over the surface, so text on it stays legible. */
const TINT_STYLE = `fill:color-mix(in srgb, currentColor ${TINT_PERCENT}%, var(--surface-bg, transparent))`;

/** `TINT_STYLE` precomputed for the file's light theme, as `color-mix(in srgb, …)` mixes it. */
const tintFallback = (color?: Shape.Color): string => {
  const hex = TEXT_HEX[colorClass(color)?.split(' ')[0] ?? ''] ?? INK_HEX;
  const channel = (offset: number, source: string) => parseInt(source.slice(offset, offset + 2), 16);
  return `#${[1, 3, 5]
    .map((offset) =>
      Math.round((channel(offset, hex) * TINT_PERCENT + channel(offset, SURFACE_HEX) * (100 - TINT_PERCENT)) / 100)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

/** The scene's bounds with a margin, and the absolute box rects arrows bind to. */
export const resolveScene = (
  objects: readonly Scene.WorldObject[],
): { viewBox: string; registry: Map<string, Rect> } => {
  const registry = Diagnostics.bindTargets(objects);
  const points: Point[] = [...registry.values()].flatMap((rect) => [rect, { x: rect.x + rect.w, y: rect.y + rect.h }]);
  for (const object of objects) {
    const { x = 0, y = 0 } = object.origin ?? {};
    const scale = object.scale ?? 1;
    for (const element of object.elements) {
      if (element.kind === 'line' || element.kind === 'curve') {
        points.push(...element.points.map((point) => ({ x: x + point.x * scale, y: y + point.y * scale })));
      } else if (element.kind === 'arrow') {
        points.push(...(Diagnostics.arrowPoints(object, element, registry) ?? []));
      }
    }
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(0, ...xs) - MARGIN;
  const minY = Math.min(0, ...ys) - MARGIN;
  const maxX = Math.max(MARGIN, ...xs) + MARGIN;
  const maxY = Math.max(MARGIN, ...ys) + MARGIN;
  return { registry, viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
};

const tspans = (lines: string[], x: number, lineH: number): Markup[] =>
  lines.map((line, index) => el('tspan', { x: x, dy: index === 0 ? 0 : lineH }, [line]));

/** Free-standing centred text, one line per `\n`. */
const multilineText = (cxValue: number, cy: number, text: string, weight: Shape.Weight, className?: string) => {
  const lines = text.split('\n');
  return el(
    'text',
    {
      'x': cxValue,
      'y': cy - ((lines.length - 1) * LINE_H(weight)) / 2,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': FONT_SIZE(weight),
      'class': cx('fill-current', className),
    },
    tspans(lines, cxValue, LINE_H(weight)),
  );
};

/** A box's label, set by `Diagnostics.layoutLabel` so it stays inside the box and the label check agrees. */
const boxLabel = (rect: Rect, text: string, weight: Shape.Weight) => {
  const { lines, size, lineH, overflow } = Diagnostics.layoutLabel(text, weight, rect);
  const mid = center(rect);
  return el(
    'text',
    {
      'x': mid.x,
      'y': mid.y - ((lines.length - 1) * lineH) / 2,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': size,
      'class': 'fill-current stroke-none',
    },
    [overflow ? el('title', {}, [text]) : undefined, ...tspans(lines, mid.x, lineH)],
  );
};

/** Per-document marker fragment ids. */
export type MarkerIds = Record<Shape.Marker, string>;

/** The marker ids under `prefix`, which keeps several scenes in one document from sharing (and fighting over) ids. */
export const markerIds = (prefix: string): MarkerIds => ({
  'arrow': `${prefix}-arrow`,
  'open': `${prefix}-open`,
  'triangle': `${prefix}-triangle`,
  'crowsfoot': `${prefix}-crowsfoot`,
  'one': `${prefix}-one`,
  'diamond': `${prefix}-diamond`,
  'diamond-filled': `${prefix}-diamond-filled`,
  'circle': `${prefix}-circle`,
});

/** The ink every element's `currentColor` resolves to unless its own color says otherwise. */
export const ROOT_CLASS = 'text-neutral-800 dark:text-neutral-200';

/**
 * One element of an object, in scene coordinates; `registry` holds the absolute rects bound arrows attach to
 * (`resolveScene`). Undefined for what draws nothing (an arrow with an unresolved end, an unsupported kind).
 */
export const elementMarkup = (
  object: Scene.WorldObject,
  element: Shape.Element,
  registry: ReadonlyMap<string, Rect>,
  markers: MarkerIds,
): Markup | undefined => {
  const { x = 0, y = 0 } = object.origin ?? {};
  const scale = object.scale ?? 1;
  const map = (point: Point): Point => ({ x: x + point.x * scale, y: y + point.y * scale });
  const weight = element.weight ?? 'm';

  switch (element.kind) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle': {
      const rect = rectOf(object, element);
      const mid = center(rect);
      const tinted = element.fill === 'tint';
      const fill = tinted
        ? undefined
        : element.fill === 'solid'
          ? 'fill-neutral-100 dark:fill-neutral-800'
          : 'fill-transparent';
      // Renderers without `color-mix` (librsvg, so sharp and ImageMagick) drop the style and would paint the
      // default black; they take the plain `fill` attribute instead, which the style overrides everywhere else.
      const paint = {
        class: fill,
        fill: tinted ? tintFallback(element.color) : undefined,
        style: tinted ? TINT_STYLE : undefined,
      };
      const shape =
        element.kind === 'ellipse'
          ? el('ellipse', { cx: mid.x, cy: mid.y, rx: rect.w / 2, ry: rect.h / 2, ...paint })
          : element.kind === 'diamond'
            ? el('polygon', {
                points: `${mid.x},${rect.y} ${rect.x + rect.w},${mid.y} ${mid.x},${rect.y + rect.h} ${rect.x},${mid.y}`,
                ...paint,
              })
            : element.kind === 'triangle'
              ? el('polygon', {
                  points: `${mid.x},${rect.y} ${rect.x + rect.w},${rect.y + rect.h} ${rect.x},${rect.y + rect.h}`,
                  ...paint,
                })
              : element.corners === 'top' || element.corners === 'bottom'
                ? el('path', { d: partiallyRoundedRect(rect, RADIUS, element.corners), ...paint })
                : el('rect', {
                    x: rect.x,
                    y: rect.y,
                    width: rect.w,
                    height: rect.h,
                    rx: element.corners === 'none' ? 0 : RADIUS,
                    ...paint,
                  });
      return el(
        'g',
        {
          'class': cx('stroke-current', colorClass(element.color)),
          'stroke-width': 1.5,
          'stroke-dasharray': element.stroke ? strokeDash[element.stroke] : undefined,
        },
        [shape, element.text ? boxLabel(rect, element.text, weight) : undefined],
      );
    }
    case 'circle': {
      const mid = map({ x: element.cx, y: element.cy });
      return el(
        'g',
        { 'class': cx('stroke-current fill-transparent', colorClass(element.color)), 'stroke-width': 1.5 },
        [
          el('circle', { cx: mid.x, cy: mid.y, r: element.r * scale }),
          element.text ? multilineText(mid.x, mid.y, element.text, weight) : undefined,
        ],
      );
    }
    case 'line':
    case 'curve': {
      const points = element.points.map(map);
      // A routed connector is a `<id>-path` polyline ending where its `<id>` arrow starts; the
      // arrow's source marker belongs at the polyline's first point, where the route begins.
      const arrow = element.id.endsWith('-path')
        ? object.elements.find((other) => other.kind === 'arrow' && other.id === element.id.slice(0, -'-path'.length))
        : undefined;
      const derived = arrow?.kind === 'arrow' ? Shape.markersOf(arrow) : undefined;
      const start = derived?.start;
      // The route takes its arrow's relation dash unless the polyline sets its own stroke.
      const stroke = element.stroke ?? (derived?.dashed ? 'dashed' : undefined);
      return el('polyline', {
        'points': points.map((point) => `${point.x},${point.y}`).join(' '),
        'class': cx('stroke-current fill-none', colorClass(element.color)),
        'stroke-width': 1.5,
        'stroke-dasharray': stroke ? strokeDash[stroke] : undefined,
        'marker-start': start ? `url(#${markers[start]})` : undefined,
      });
    }
    case 'text': {
      const anchor = map(element);
      const textWeight = element.weight ?? 's';
      const fontSize = FONT_SIZE(textWeight);
      const maxChars = element.w ? Math.max(4, Math.floor((element.w * scale) / (fontSize * CHAR_EM))) : Infinity;
      return el(
        'text',
        {
          'x': anchor.x,
          'y': anchor.y + LINE_H(textWeight) / 2,
          'font-size': fontSize,
          // Muted text (group titles) is still text to read: grey strokes stay light, grey type meets 4.5:1.
          'font-weight': element.color === 'grey' ? 500 : undefined,
          'class': cx('fill-current', element.color === 'grey' ? MUTED_TEXT : colorClass(element.color)),
        },
        tspans(wrapLines(element.text, maxChars), anchor.x, LINE_H(textWeight)),
      );
    }
    case 'portal': {
      // A window onto another drawing; without nesting the frame stands in for its content.
      const rect = rectOf(object, element);
      return el(
        'g',
        {
          'class': cx('stroke-current fill-transparent', colorClass(element.color)),
          'stroke-width': 1.5,
          'stroke-dasharray': strokeDash[element.stroke ?? 'dashed'],
        },
        [
          el('rect', { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: RADIUS }),
          element.text
            ? multilineText(center(rect).x, rect.y + LINE_H('s'), element.text, 's', 'stroke-none')
            : undefined,
        ],
      );
    }
    case 'arrow': {
      // Drawn along the geometry `Diagnostics` measures: bound ends clipped at the borders, ports dropped.
      const points = Diagnostics.arrowPoints(object, element, registry);
      if (!points) {
        return undefined;
      }
      const [start, end] = [points[points.length - 2], points[points.length - 1]];
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const { start: tail, end: head, dashed } = Shape.markersOf(element);
      // On a routed connector the source marker is drawn by its `-path` polyline instead.
      const routed = object.elements.some(
        (other) => (other.kind === 'line' || other.kind === 'curve') && other.id === `${element.id}-path`,
      );
      const stroke = {
        'stroke-width': 1.5,
        'stroke-dasharray': element.stroke ? strokeDash[element.stroke] : dashed ? strokeDash.dashed : undefined,
        'marker-end': head ? `url(#${markers[head]})` : undefined,
        'marker-start': tail && !routed ? `url(#${markers[tail]})` : undefined,
      };
      const line =
        points.length === 2
          ? el('line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y, ...stroke })
          : el('polyline', {
              points: points.map((point) => `${point.x},${point.y}`).join(' '),
              class: 'fill-none',
              ...stroke,
            });
      return el('g', { class: cx('stroke-current', colorClass(element.color)) }, [
        line,
        element.text ? multilineText(mid.x, mid.y - LINE_H('s') / 2, element.text, 's', 'stroke-none') : undefined,
      ]);
    }
    default:
      return undefined;
  }
};

const INK = 'stroke-neutral-800 dark:stroke-neutral-200';
const INK_FILL = 'fill-neutral-800 dark:fill-neutral-200';

/** UML end markers. `auto-start-reverse` lets the same shapes serve as head or tail. */
export const markerDefs = (markers: MarkerIds): Markup[] => {
  const marker = (
    id: string,
    box: { viewBox: string; refX: number; refY: number; width: number; height: number },
    body: Markup,
    orient = 'auto-start-reverse',
  ) =>
    el(
      'marker',
      {
        id,
        viewBox: box.viewBox,
        refX: box.refX,
        refY: box.refY,
        markerWidth: box.width,
        markerHeight: box.height,
        orient,
      },
      [body],
    );
  const square = { viewBox: '0 0 12 12', refX: 11, refY: 6, width: 12, height: 12 };
  const diamond = { viewBox: '0 0 18 10', refX: 17, refY: 5, width: 18, height: 10 };
  return [
    marker(
      markers.arrow,
      { viewBox: '0 0 10 10', refX: 9, refY: 5, width: 8, height: 8 },
      el('path', { d: 'M 0 1 L 9 5 L 0 9 z', class: `${INK_FILL} stroke-none` }),
    ),
    // Hollow: filled with the surface so the line does not show through the triangle.
    marker(
      markers.triangle,
      square,
      el('path', {
        'd': 'M 1 1 L 11 6 L 1 11 z',
        'fill': SURFACE_FILL,
        'class': INK,
        'stroke-width': 1.2,
      }),
    ),
    marker(
      markers.crowsfoot,
      square,
      el('path', { 'd': 'M 0 6 L 11 1 M 0 6 L 11 6 M 0 6 L 11 11', 'class': `fill-none ${INK}`, 'stroke-width': 1.2 }),
    ),
    marker(
      markers.open,
      square,
      el('path', { 'd': 'M 1 1 L 11 6 L 1 11', 'class': `fill-none ${INK}`, 'stroke-width': 1.2 }),
    ),
    // The one bar of ER notation: a stroke across the line just inside the end.
    marker(markers.one, square, el('path', { 'd': 'M 7 1 L 7 11', 'class': `fill-none ${INK}`, 'stroke-width': 1.2 })),
    // Diamonds at the whole's end: hollow for aggregation, filled for composition.
    marker(
      markers.diamond,
      diamond,
      el('path', {
        'd': 'M 1 5 L 9 1 L 17 5 L 9 9 z',
        'fill': SURFACE_FILL,
        'class': INK,
        'stroke-width': 1.2,
      }),
    ),
    marker(
      markers['diamond-filled'],
      diamond,
      el('path', { 'd': 'M 1 5 L 9 1 L 17 5 L 9 9 z', 'class': `${INK_FILL} ${INK}`, 'stroke-width': 1.2 }),
    ),
    marker(
      markers.circle,
      { viewBox: '0 0 10 10', refX: 2, refY: 5, width: 8, height: 8 },
      el('circle', { cx: '5', cy: '5', r: '3', class: `${INK_FILL} stroke-none` }),
      'auto',
    ),
  ];
};

export type SceneMarkupOptions = {
  /** Prefix for the document-global marker ids, so several scenes inlined in one page do not collide. */
  idPrefix?: string;
};

/** What a connector draws with apart from its route: its relation (markers and dash), stroke and color. */
export type ConnectorStyle = Pick<Shape.Arrow, 'relation' | 'head' | 'tail' | 'stroke' | 'color'>;

/**
 * A connector along `points` as the layout emits one: the `<id>-path` polyline up to its last leg, then the `<id>`
 * arrow over that leg, so `elementMarkup` puts the source marker where the route starts and the head where it ends.
 */
export const connectorElements = (
  id: string,
  points: readonly Point[],
  style: ConnectorStyle,
  text?: string,
): Shape.Element[] => {
  if (points.length < 2) {
    return [];
  }
  const stroke = style.stroke
    ? { stroke: style.stroke }
    : Shape.markersOf(style).dashed
      ? { stroke: 'dashed' as const }
      : {};
  const color = style.color ? { color: style.color } : {};
  return [
    ...(points.length > 2
      ? [{ kind: 'line' as const, id: `${id}-path`, points: points.slice(0, -1), ...stroke, ...color }]
      : []),
    {
      kind: 'arrow',
      id,
      start: points[points.length - 2],
      end: points[points.length - 1],
      ...(style.relation ? { relation: style.relation } : {}),
      ...(style.head ? { head: style.head } : {}),
      ...(style.tail ? { tail: style.tail } : {}),
      ...(text ? { text } : {}),
      ...stroke,
      ...color,
    },
  ];
};

/** The scene as a non-interactive `<svg>` element tree (no `xmlns`, size or stylesheet; see `toSvgFile`). */
export const sceneTree = (
  objects: readonly Scene.WorldObject[],
  { idPrefix = 'dx' }: SceneMarkupOptions = {},
): Markup => {
  const { registry, viewBox } = resolveScene(objects);
  const markers = markerIds(idPrefix);
  return el('svg', { viewBox, class: `dx-fill ${ROOT_CLASS}` }, [
    el('defs', {}, markerDefs(markers)),
    ...objects.map((object) =>
      el(
        'g',
        { 'data-object': object.id },
        object.elements.map((element) => elementMarkup(object, element, registry, markers)),
      ),
    ),
  ]);
};

/** `sceneTree` as SVG text. */
export const sceneMarkup = (objects: readonly Scene.WorldObject[], options: SceneMarkupOptions = {}): string =>
  serialize(sceneTree(objects, options));

/**
 * The renderer styles with Tailwind utilities; a file on disk has no stylesheet, so the export
 * inlines the handful it uses (light theme, Tailwind's neutral palette).
 */
const STYLE = `
  svg { font-family: ui-sans-serif, system-ui, sans-serif; color: ${INK_HEX}; background: ${SURFACE_HEX}; }
  .stroke-current { stroke: currentColor; }
  .fill-current { fill: currentColor; }
  .fill-transparent { fill: transparent; }
  .fill-none { fill: none; }
  .stroke-none { stroke: none; }
  .fill-neutral-100 { fill: #f5f5f5; }
  .fill-neutral-800 { fill: #262626; }
  .stroke-neutral-800 { stroke: #262626; }
  svg { --surface-bg: ${SURFACE_HEX}; }
${Object.entries(TEXT_HEX)
  .map(([name, hex]) => `  .${name} { color: ${hex}; }\n`)
  .join('')}  .stroke-neutral-500\\/20 { stroke: rgba(115, 115, 115, 0.2); }
`;

/**
 * A standalone SVG file of a scene: the markup, width and height from its viewBox, and the inline styles.
 * Without the editor's background grid, which on a page is ink that carries no information.
 */
export const toSvgFile = (objects: readonly Scene.WorldObject[]): string => {
  const markup = sceneMarkup(objects);
  const viewBox = /viewBox="([^"]+)"/.exec(markup)?.[1].split(' ').map(Number) ?? [0, 0, 0, 0];
  return markup
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox[2]}" height="${viewBox[3]}" `)
    .replace('<defs>', `<style>${STYLE}</style><defs>`);
};
