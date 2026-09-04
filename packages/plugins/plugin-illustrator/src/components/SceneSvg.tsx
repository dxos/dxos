//
// Copyright 2026 DXOS.org
//

import React, { useId, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Scene } from '#model';

/**
 * Text sizes per scene weight for a standard UI font. Proportional to `Layout.FONT_METRICS`
 * (which measures tldraw's chunkier draw font), so text always fits boxes sized by the dialects.
 */
const FONT_SIZE: Record<Scene.Weight, number> = { s: 13, m: 18, l: 27, xl: 34 };
const LINE_H: Record<Scene.Weight, number> = { s: 20, m: 26, l: 38, xl: 48 };

const MARGIN = 40;

type Rect = { x: number; y: number; w: number; h: number };
type Point = Scene.Point;

const rectOf = (object: Scene.WorldObject, element: Scene.Box): Rect => {
  const { x = 0, y = 0 } = object.origin ?? {};
  const scale = object.scale ?? 1;
  return { x: x + element.x * scale, y: y + element.y * scale, w: element.w * scale, h: element.h * scale };
};

const center = (rect: Rect): Point => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

/** Point where the segment from a rect's center toward `target` crosses the rect border. */
const clipToBorder = (rect: Rect, target: Point): Point => {
  const source = center(rect);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  let t = 1;
  if (dx !== 0) {
    t = Math.min(t, ((dx > 0 ? rect.x + rect.w : rect.x) - source.x) / dx);
  }
  if (dy !== 0) {
    t = Math.min(t, ((dy > 0 ? rect.y + rect.h : rect.y) - source.y) / dy);
  }
  return { x: source.x + dx * t, y: source.y + dy * t };
};

const strokeDash: Partial<Record<Scene.Stroke, string>> = { dashed: '6 4', dotted: '2 4' };

/** Average glyph advance as a fraction of font size, for wrap estimates (UI sans). */
const CHAR_EM = 0.6;

/** Greedy word wrap per input line; SVG text has no native wrapping. */
const wrapLines = (text: string, maxChars: number): string[] =>
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

const RADIUS = 8;

/** Rect path rounding only the top or bottom corners; the opposite edge stays square. */
const partiallyRoundedRect = ({ x, y, w, h }: Rect, cornerRadius: number, corners: 'top' | 'bottom'): string => {
  // Clamp so small rects cannot produce self-overlapping path segments.
  const radius = Math.min(cornerRadius, w / 2, h / 2);
  return corners === 'top'
    ? `M ${x} ${y + h} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} L ${x + w - radius} ${y} ` +
        `Q ${x + w} ${y} ${x + w} ${y + radius} L ${x + w} ${y + h} Z`
    : `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - radius} Q ${x + w} ${y + h} ${x + w - radius} ${y + h} ` +
        `L ${x + radius} ${y + h} Q ${x} ${y + h} ${x} ${y + h - radius} Z`;
};

/** Muted stroke/text for elements the dialects mark grey (e.g. subgraph frames). */
const colorClass = (color?: Scene.Color) => (color === 'grey' ? 'text-neutral-400 dark:text-neutral-500' : undefined);

type Resolved = {
  viewBox: string;
  /** Absolute box rects keyed by `objectId/elementId`, for arrow binding. */
  registry: Map<string, Rect>;
  objects: readonly Scene.WorldObject[];
};

const resolve = (objects: readonly Scene.WorldObject[]): Resolved => {
  const registry = new Map<string, Rect>();
  const points: Point[] = [];
  for (const object of objects) {
    const { x = 0, y = 0 } = object.origin ?? {};
    const scale = object.scale ?? 1;
    for (const element of object.elements) {
      switch (element.kind) {
        case 'rect':
        case 'ellipse':
        case 'diamond':
        case 'triangle': {
          const rect = rectOf(object, element);
          registry.set(`${object.id}/${element.id}`, rect);
          points.push(rect, { x: rect.x + rect.w, y: rect.y + rect.h });
          break;
        }
        case 'line':
        case 'curve': {
          points.push(...element.points.map((point) => ({ x: x + point.x * scale, y: y + point.y * scale })));
          break;
        }
        case 'arrow': {
          for (const terminal of [element.start, element.end]) {
            if (terminal) {
              points.push({ x: x + terminal.x * scale, y: y + terminal.y * scale });
            }
          }
          break;
        }
        default:
          break;
      }
    }
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(0, ...xs) - MARGIN;
  const minY = Math.min(0, ...ys) - MARGIN;
  const maxX = Math.max(MARGIN, ...xs) + MARGIN;
  const maxY = Math.max(MARGIN, ...ys) + MARGIN;

  return {
    objects,
    registry,
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  };
};

type MultilineTextProps = {
  cx: number;
  cy: number;
  text: string;
  weight: Scene.Weight;
  className?: string;
};

const MultilineText = ({ cx, cy, text, weight, className }: MultilineTextProps) => {
  const lines = text.split('\n');
  const lineH = LINE_H[weight];
  return (
    <text
      x={cx}
      y={cy - ((lines.length - 1) * lineH) / 2}
      textAnchor='middle'
      dominantBaseline='central'
      fontSize={FONT_SIZE[weight]}
      className={mx('fill-current', className)}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={cx} dy={index === 0 ? 0 : lineH}>
          {line}
        </tspan>
      ))}
    </text>
  );
};

type ElementProps = {
  object: Scene.WorldObject;
  element: Scene.Element;
  registry: Map<string, Rect>;
  /** Per-instance arrowhead marker fragment id (multiple SceneSvgs may share a page). */
  markerId: string;
};

const SceneElement = ({ object, element, registry, markerId }: ElementProps) => {
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
      const fill = element.fill === 'solid' ? 'fill-neutral-100 dark:fill-neutral-800' : 'fill-transparent';
      const shape =
        element.kind === 'ellipse' ? (
          <ellipse cx={mid.x} cy={mid.y} rx={rect.w / 2} ry={rect.h / 2} className={fill} />
        ) : element.kind === 'diamond' ? (
          <polygon
            points={`${mid.x},${rect.y} ${rect.x + rect.w},${mid.y} ${mid.x},${rect.y + rect.h} ${rect.x},${mid.y}`}
            className={fill}
          />
        ) : element.kind === 'triangle' ? (
          <polygon
            points={`${mid.x},${rect.y} ${rect.x + rect.w},${rect.y + rect.h} ${rect.x},${rect.y + rect.h}`}
            className={fill}
          />
        ) : element.corners === 'top' || element.corners === 'bottom' ? (
          <path d={partiallyRoundedRect(rect, RADIUS, element.corners)} className={fill} />
        ) : (
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            rx={element.corners === 'none' ? 0 : RADIUS}
            className={fill}
          />
        );
      return (
        <g
          className={mx('stroke-current', colorClass(element.color))}
          strokeWidth={1.5}
          strokeDasharray={element.stroke ? strokeDash[element.stroke] : undefined}
        >
          {shape}
          {element.text && (
            <MultilineText cx={mid.x} cy={mid.y} text={element.text} weight={weight} className='stroke-none' />
          )}
        </g>
      );
    }
    case 'circle': {
      const mid = map({ x: element.cx, y: element.cy });
      return (
        <g className={mx('stroke-current fill-transparent', colorClass(element.color))} strokeWidth={1.5}>
          <circle cx={mid.x} cy={mid.y} r={element.r * scale} />
          {element.text && <MultilineText cx={mid.x} cy={mid.y} text={element.text} weight={weight} />}
        </g>
      );
    }
    case 'line':
    case 'curve': {
      const points = element.points.map(map);
      return (
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          className={mx('stroke-current fill-none', colorClass(element.color))}
          strokeWidth={1.5}
          strokeDasharray={element.stroke ? strokeDash[element.stroke] : undefined}
        />
      );
    }
    case 'text': {
      const anchor = map(element);
      const textWeight = element.weight ?? 's';
      const fontSize = FONT_SIZE[textWeight];
      const maxChars = element.w ? Math.max(4, Math.floor((element.w * scale) / (fontSize * CHAR_EM))) : Infinity;
      const lines = wrapLines(element.text, maxChars);
      return (
        <text
          x={anchor.x}
          y={anchor.y + LINE_H[textWeight] / 2}
          fontSize={fontSize}
          className={mx('fill-current', colorClass(element.color))}
        >
          {lines.map((line, index) => (
            <tspan key={index} x={anchor.x} dy={index === 0 ? 0 : LINE_H[textWeight]}>
              {line}
            </tspan>
          ))}
        </text>
      );
    }
    case 'arrow': {
      // Bound refs resolve via the registry, clipping the center-to-center segment at each border.
      const ref = (value: string) => registry.get(value.includes('/') ? value : `${object.id}/${value}`);
      const fromRect = element.from ? ref(element.from) : undefined;
      const toRect = element.to ? ref(element.to) : undefined;
      const start = fromRect
        ? clipToBorder(fromRect, toRect ? center(toRect) : map(element.end ?? { x: 0, y: 0 }))
        : element.start
          ? map(element.start)
          : undefined;
      const end = toRect
        ? clipToBorder(toRect, fromRect ? center(fromRect) : map(element.start ?? { x: 0, y: 0 }))
        : element.end
          ? map(element.end)
          : undefined;
      if (!start || !end) {
        return null;
      }
      const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      return (
        <g className={mx('stroke-current', colorClass(element.color))}>
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            strokeWidth={1.5}
            strokeDasharray={element.stroke ? strokeDash[element.stroke] : undefined}
            markerEnd={`url(#${markerId})`}
          />
          {element.text && (
            <MultilineText
              cx={mid.x}
              cy={mid.y - LINE_H.s / 2}
              text={element.text}
              weight='s'
              className='stroke-none'
            />
          )}
        </g>
      );
    }
    default:
      return null;
  }
};

export type SceneSvgProps = ThemedClassName<{
  objects: readonly Scene.WorldObject[];
  /** Draw the alignment grid at this spacing (scene px). */
  grid?: number;
}>;

/**
 * Minimal SVG backend for the scene DSL: renders world objects directly (no canvas editor),
 * resolving bound arrow refs against box borders. Useful for read-only previews and stories;
 * interaction/persistence stays with the tldraw backend.
 */
export const SceneSvg = ({ classNames, objects, grid }: SceneSvgProps) => {
  const { registry, viewBox } = useMemo(() => resolve(objects), [objects]);
  // Fragment ids are document-global: derive per-instance ids so co-rendered scenes don't collide.
  const instanceId = useId();
  const markerId = `${instanceId}-arrowhead`;
  const gridId = `${instanceId}-grid`;

  return (
    <svg viewBox={viewBox} className={mx('dx-fill text-neutral-800 dark:text-neutral-200', classNames)}>
      <defs>
        <marker
          id={markerId}
          viewBox='0 0 10 10'
          refX='9'
          refY='5'
          markerWidth='8'
          markerHeight='8'
          orient='auto-start-reverse'
        >
          <path d='M 0 1 L 9 5 L 0 9 z' className='fill-neutral-800 dark:fill-neutral-200 stroke-none' />
        </marker>
        {grid && (
          <pattern id={gridId} width={grid} height={grid} patternUnits='userSpaceOnUse'>
            <path d={`M ${grid} 0 L 0 0 0 ${grid}`} className='fill-none stroke-neutral-500/20' strokeWidth={1} />
          </pattern>
        )}
      </defs>
      {grid && <rect x='-10000' y='-10000' width='20000' height='20000' fill={`url(#${gridId})`} />}
      {objects.map((object) => (
        <g key={object.id}>
          {object.elements.map((element) => (
            <SceneElement key={element.id} object={object} element={element} registry={registry} markerId={markerId} />
          ))}
        </g>
      ))}
    </svg>
  );
};
