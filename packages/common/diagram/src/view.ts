//
// Copyright 2026 DXOS.org
//

//
// Text views of a laid-out scene, for a judge that reads text but cannot see images: a coordinate
// listing and an ASCII rasterization. Both are derived from the emitted scene alone, like
// `Diagnostics`, so they show what the renderer draws rather than what the source declared.
//

import type * as Scene from './scene.ts';

type Point = Scene.Point;
type Rect = { x: number; y: number; w: number; h: number };

export type Box = { ref: string; label?: string; rect: Rect; frame: boolean };
export type Path = { ref: string; points: Point[]; label?: string; from?: Box; to?: Box };

export type Drawing = { boxes: Box[]; paths: Path[]; bounds: Rect };

const place = (object: Scene.WorldObject, point: Point): Point => {
  const { x = 0, y = 0 } = object.origin ?? {};
  const scale = object.scale ?? 1;
  return { x: x + point.x * scale, y: y + point.y * scale };
};

const contains = (outer: Rect, inner: Rect) =>
  outer.x <= inner.x &&
  outer.y <= inner.y &&
  outer.x + outer.w >= inner.x + inner.w &&
  outer.y + outer.h >= inner.y + inner.h &&
  (outer.w > inner.w || outer.h > inner.h);

const distance = ({ x, y }: Point, rect: Rect) =>
  Math.hypot(Math.max(rect.x - x, 0, x - rect.x - rect.w), Math.max(rect.y - y, 0, y - rect.y - rect.h));

/** Boxes, frames and connector paths in absolute coordinates, each path resolved to the boxes at its ends. */
export const extract = (objects: readonly Scene.WorldObject[]): Drawing => {
  const boxes: Box[] = [];
  const lines = new Map<string, Path>();
  const labels = new Map<string, string>();
  for (const object of objects) {
    const scale = object.scale ?? 1;
    for (const element of object.elements) {
      if (element.kind === 'rect' || element.kind === 'ellipse' || element.kind === 'diamond') {
        const origin = place(object, element);
        boxes.push({
          ref: `${object.id}/${element.id}`,
          label: element.text,
          rect: { x: origin.x, y: origin.y, w: element.w * scale, h: element.h * scale },
          frame: false,
        });
      } else if (element.kind === 'line') {
        const id = element.id.replace(/-path$/, '');
        lines.set(id, { ref: `${object.id}/${id}`, points: element.points.map((point) => place(object, point)) });
      } else if (element.kind === 'text') {
        labels.set(element.id.replace(/-label$/, ''), element.text);
      }
    }
    for (const element of object.elements) {
      if (element.kind === 'arrow' && element.start && element.end) {
        const head = [place(object, element.start), place(object, element.end)];
        const existing = lines.get(element.id);
        lines.set(element.id, {
          ref: `${object.id}/${element.id}`,
          points: existing ? [...existing.points.slice(0, -1), ...head] : head,
        });
      }
    }
  }
  // A group frame is a box that encloses another box; its label is the object's free text.
  const frameLabels = new Map(
    objects.flatMap((object) =>
      object.elements.flatMap((element) => (element.kind === 'text' ? [[object.id, element.text] as const] : [])),
    ),
  );
  for (const box of boxes) {
    if (boxes.some((other) => other !== box && contains(box.rect, other.rect))) {
      box.frame = true;
      box.label ??= frameLabels.get(box.ref.slice(0, box.ref.indexOf('/')));
    }
  }
  const nodes = boxes.filter(({ frame }) => !frame);
  const nearest = (point: Point) =>
    nodes.reduce<Box | undefined>(
      (best, box) => (!best || distance(point, box.rect) < distance(point, best.rect) ? box : best),
      undefined,
    );
  const paths = [...lines.entries()].map(([id, path]) => ({
    ...path,
    label: labels.get(id),
    from: nearest(path.points[0]),
    to: nearest(path.points[path.points.length - 1]),
  }));
  const xs = boxes.flatMap(({ rect }) => [rect.x, rect.x + rect.w]);
  const ys = boxes.flatMap(({ rect }) => [rect.y, rect.y + rect.h]);
  const bounds = xs.length
    ? {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      }
    : { x: 0, y: 0, w: 0, h: 0 };
  return { boxes, paths, bounds };
};

const name = (box?: Box) => (box ? `"${box.label ?? box.ref}"` : '(free end)');

const groupOf = (box: Box, boxes: readonly Box[]) =>
  boxes.find((other) => other.frame && contains(other.rect, box.rect));

/**
 * Every box, frame and connector with its position in grid cells from the top-left corner (x right,
 * y down): what a person reads off the picture as "where", in numbers.
 */
export const coordinates = (objects: readonly Scene.WorldObject[], cell = 32): string => {
  const { boxes, paths, bounds } = extract(objects);
  const unit = (value: number) => Math.round((value / cell) * 10) / 10;
  const at = ({ x, y }: Point) => `(${unit(x - bounds.x)}, ${unit(y - bounds.y)})`;
  const lines = [`canvas ${unit(bounds.w)} × ${unit(bounds.h)} cells; x grows right, y grows down`];
  for (const box of boxes.filter(({ frame }) => frame)) {
    lines.push(`group ${name(box)}: top-left ${at(box.rect)}, size ${unit(box.rect.w)} × ${unit(box.rect.h)}`);
  }
  for (const box of boxes.filter(({ frame }) => !frame)) {
    const group = groupOf(box, boxes);
    lines.push(
      `box ${name(box)}${group ? ` in ${name(group)}` : ''}: top-left ${at(box.rect)}, size ${unit(box.rect.w)} × ${unit(box.rect.h)}`,
    );
  }
  for (const path of paths) {
    lines.push(
      `arrow ${name(path.from)} → ${name(path.to)}${path.label ? ` labelled "${path.label}"` : ''}: ${path.points.map(at).join(' → ')}`,
    );
  }
  return lines.join('\n');
};

/**
 * The drawing in words, as a reader scans it: boxes row by row from the top, left to right, then each
 * arrow with the way it runs across the page and the rows it spans.
 */
export const rows = (objects: readonly Scene.WorldObject[]): string => {
  const { boxes, paths } = extract(objects);
  const nodes = boxes.filter(({ frame }) => !frame);
  const middle = ({ rect }: Box) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
  // Boxes whose centres are within half a box height share a row.
  const bands: Box[][] = [];
  for (const box of [...nodes].sort((a, b) => middle(a).y - middle(b).y)) {
    const band = bands[bands.length - 1];
    if (band && middle(box).y - middle(band[0]).y < box.rect.h / 2) {
      band.push(box);
    } else {
      bands.push([box]);
    }
  }
  const rowOf = new Map(bands.flatMap((band, index) => band.map((box) => [box, index + 1] as const)));
  const lines = bands.map((band, index) => {
    const cells = [...band]
      .sort((a, b) => middle(a).x - middle(b).x)
      .map((box) => {
        const group = groupOf(box, boxes);
        return `${name(box)}${group ? ` [${group.label ?? group.ref}]` : ''}`;
      });
    return `row ${index + 1}${index === 0 ? ' (top)' : index === bands.length - 1 ? ' (bottom)' : ''}, left to right: ${cells.join(', ')}`;
  });
  for (const path of paths) {
    const [start, end] = [path.points[0], path.points[path.points.length - 1]];
    const [dx, dy] = [end.x - start.x, end.y - start.y];
    const vertical = Math.abs(dy) >= 16 ? (dy > 0 ? 'down' : 'up') : undefined;
    const horizontal = Math.abs(dx) >= 16 ? (dx > 0 ? 'right' : 'left') : undefined;
    const way = [vertical, horizontal].filter(Boolean).join(' and ') || 'in place';
    const span = path.from && path.to ? `, row ${rowOf.get(path.from)} to row ${rowOf.get(path.to)}` : '';
    const bends = path.points.length > 2 ? `, ${path.points.length - 2} bends` : '';
    lines.push(
      `arrow ${name(path.from)} → ${name(path.to)}${path.label ? ` labelled "${path.label}"` : ''} runs ${way}${span}${bends}`,
    );
  }
  return lines.join('\n');
};

export type AsciiOptions = {
  /** Scene units per column; small enough that a box's label fits inside it. */
  column?: number;
  /** Scene units per row. */
  row?: number;
};

// Line-drawing directions as bits, so a cell crossed twice combines into the right junction glyph.
const UP = 1;
const DOWN = 2;
const LEFT = 4;
const RIGHT = 8;
const GLYPHS: Record<number, string> = {
  [UP | DOWN]: '│',
  [LEFT | RIGHT]: '─',
  [DOWN | RIGHT]: '┌',
  [DOWN | LEFT]: '┐',
  [UP | RIGHT]: '└',
  [UP | LEFT]: '┘',
  [UP | DOWN | RIGHT]: '├',
  [UP | DOWN | LEFT]: '┤',
  [LEFT | RIGHT | DOWN]: '┬',
  [LEFT | RIGHT | UP]: '┴',
  [UP | DOWN | LEFT | RIGHT]: '┼',
  [UP]: '│',
  [DOWN]: '│',
  [LEFT]: '─',
  [RIGHT]: '─',
};

/**
 * The drawing rasterized onto a character grid: boxes with their labels, dashed group frames, routed
 * connectors with corners and junctions, and an arrowhead where each connector ends.
 */
export const ascii = (objects: readonly Scene.WorldObject[], { column = 8, row = 16 }: AsciiOptions = {}): string => {
  const { boxes, paths, bounds } = extract(objects);
  const col = (x: number) => Math.round((x - bounds.x) / column);
  const rowOf = (y: number) => Math.round((y - bounds.y) / row);
  const width = col(bounds.x + bounds.w) + 1;
  const height = rowOf(bounds.y + bounds.h) + 1;
  const text = Array.from({ length: height }, () => Array.from({ length: width }, () => ' '));
  const bits = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  const put = (r: number, c: number, glyph: string) => {
    if (r >= 0 && r < height && c >= 0 && c < width) {
      text[r][c] = glyph;
    }
  };
  const write = (r: number, c: number, value: string) => [...value].forEach((glyph, index) => put(r, c + index, glyph));

  const drawBox = (box: Box, horizontal: string, vertical: string, corners: string) => {
    const [left, top, right, bottom] = [
      col(box.rect.x),
      rowOf(box.rect.y),
      col(box.rect.x + box.rect.w),
      rowOf(box.rect.y + box.rect.h),
    ];
    for (let c = left; c <= right; c++) {
      put(top, c, horizontal);
      put(bottom, c, horizontal);
    }
    for (let r = top; r <= bottom; r++) {
      put(r, left, vertical);
      put(r, right, vertical);
    }
    put(top, left, corners[0]);
    put(top, right, corners[1]);
    put(bottom, left, corners[2]);
    put(bottom, right, corners[3]);
    return { left, top, right, bottom };
  };

  for (const frame of boxes.filter(({ frame }) => frame)) {
    const { left, top } = drawBox(frame, '┄', '┆', '┌┐└┘');
    if (frame.label) {
      write(top, left + 2, ` ${frame.label} `);
    }
  }

  // Connectors accumulate direction bits per cell, so crossings and shared runs read as junctions.
  for (const path of paths) {
    for (let index = 0; index < path.points.length - 1; index++) {
      const [a, b] = [path.points[index], path.points[index + 1]];
      const [r0, c0, r1, c1] = [rowOf(a.y), col(a.x), rowOf(b.y), col(b.x)];
      if (r0 === r1) {
        const [from, to] = c0 < c1 ? [c0, c1] : [c1, c0];
        for (let c = from; c <= to; c++) {
          bits[r0][c] |= (c > from ? LEFT : 0) | (c < to ? RIGHT : 0);
        }
      } else if (c0 === c1) {
        const [from, to] = r0 < r1 ? [r0, r1] : [r1, r0];
        for (let r = from; r <= to; r++) {
          bits[r][c0] |= (r > from ? UP : 0) | (r < to ? DOWN : 0);
        }
      } else {
        // Diagonal runs are rare (curves); a dotted trace keeps them visible without faking junctions.
        const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
        for (let step = 0; step <= steps; step++) {
          put(Math.round(r0 + ((r1 - r0) * step) / steps), Math.round(c0 + ((c1 - c0) * step) / steps), '·');
        }
      }
    }
  }
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (bits[r][c]) {
        text[r][c] = GLYPHS[bits[r][c]] ?? '┼';
      }
    }
  }

  for (const box of boxes.filter(({ frame }) => !frame)) {
    const { left, top, right, bottom } = drawBox(box, '─', '│', '╭╮╰╯');
    for (let r = top + 1; r < bottom; r++) {
      for (let c = left + 1; c < right; c++) {
        put(r, c, ' ');
      }
    }
    const inner = right - left - 1;
    const label = (box.label ?? '').slice(0, inner);
    write(Math.round((top + bottom) / 2), left + 1 + Math.floor((inner - label.length) / 2), label);
  }

  for (const path of paths) {
    const [a, b] = path.points.slice(-2);
    const glyph = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? (b.x > a.x ? '▶' : '◀') : b.y > a.y ? '▼' : '▲';
    // The head sits on the last cell outside the target box, where the line meets its border.
    const [dr, dc] = glyph === '▶' ? [0, -1] : glyph === '◀' ? [0, 1] : glyph === '▼' ? [-1, 0] : [1, 0];
    put(rowOf(b.y) + dr, col(b.x) + dc, glyph);
    if (path.label) {
      const middle = path.points[Math.floor((path.points.length - 1) / 2)];
      const next = path.points[Math.floor((path.points.length - 1) / 2) + 1];
      const r = rowOf((middle.y + next.y) / 2);
      const c = col((middle.x + next.x) / 2);
      // Beside a vertical run, above a horizontal one, so the label does not erase the line.
      if (middle.x === next.x) {
        write(r, c + 2, path.label);
      } else {
        write(r - 1, c - Math.floor(path.label.length / 2), path.label);
      }
    }
  }

  return text.map((line) => line.join('').trimEnd()).join('\n');
};
