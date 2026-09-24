//
// Copyright 2026 DXOS.org
//

//
// Canonical text for a scene. The form is fixed — two-space indent, one element per line, a blank
// line between statements, attributes in the order `vocabulary.ts` lists them — because
// `parse(print(x))` round-tripping is only worth anything if the text side is normalized too.
//

import type * as Scene from '../scene.ts';
import { BARE_ID, BARE_REF, ELEMENT_ATTRS, OBJECT_ATTRS, RESERVED } from './vocabulary.ts';

const ESCAPES: Record<string, string> = { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\t': '\\t', '\r': '\\r' };

/**
 * Shortest form that reads back: integers keep no trailing zeros, negatives keep their sign, and
 * the exponent notation `String` switches to outside ~1e-7..1e21 is spelled as-is, which the
 * grammar accepts. `NaN` and `Infinity` have no readable form at all, so they are refused here
 * rather than silently producing a document that cannot be parsed.
 */
export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new TypeError(`A scene coordinate must be finite; got ${value}.`);
  }
  return String(value);
};

export const formatString = (value: string): string =>
  `"${value.replace(/[\\"\n\t\r]/g, (character) => ESCAPES[character] ?? character)}"`;

/** Bare where the grammar allows it, quoted where a word would be read as a keyword or fail to lex. */
export const formatId = (id: string): string => (BARE_ID.test(id) && !RESERVED.has(id) ? id : formatString(id));

const formatPoint = ({ x, y }: Scene.Point): string => `${formatNumber(x)},${formatNumber(y)}`;

const formatSize = (w: number, h: number): string => `${formatNumber(w)}x${formatNumber(h)}`;

/**
 * Quoted unless every id in it is a bare word: a dialect may build a ref from a node id the
 * grammar cannot lex, such as mermaid's `1st` becoming `1st/box`, and an unquoted one would make
 * the printed scene fail to parse.
 */
const formatRef = (ref: string): string => (BARE_REF.test(ref) && !RESERVED.has(ref) ? ref : formatString(ref));

/** `_` is the end the schema leaves unset; a bound end prints as its ref, a free one as a point. */
const formatEndpoint = (ref: string | undefined, point: Scene.Point | undefined): string =>
  ref !== undefined ? formatRef(ref) : point !== undefined ? formatPoint(point) : '_';

type AttrValue = string | number | boolean;

/** Prints `name=value` for the attributes of `kind` that are set, in the table's order. */
const formatAttrs = (kind: keyof typeof ELEMENT_ATTRS, values: Partial<Record<string, AttrValue>>): string[] =>
  ELEMENT_ATTRS[kind].flatMap(({ name, type }) => {
    const value = values[name];
    if (value === undefined) {
      return [];
    }
    return [`${name}=${type === 'string' && typeof value === 'string' ? formatString(value) : String(value)}`];
  });

const style = ({ color, fill, stroke, weight }: Scene.Element): Partial<Record<string, AttrValue>> => ({
  color,
  fill,
  stroke,
  weight,
});

export const formatElement = (element: Scene.Element): string => {
  switch (element.kind) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle':
      return [
        element.kind,
        formatId(element.id),
        formatPoint(element),
        formatSize(element.w, element.h),
        ...(element.text === undefined ? [] : [formatString(element.text)]),
        ...formatAttrs(element.kind, { rotation: element.rotation, corners: element.corners, ...style(element) }),
      ].join(' ');

    case 'circle':
      return [
        'circle',
        formatId(element.id),
        formatPoint({ x: element.cx, y: element.cy }),
        formatNumber(element.r),
        ...(element.text === undefined ? [] : [formatString(element.text)]),
        ...formatAttrs('circle', style(element)),
      ].join(' ');

    case 'line':
      return [
        'line',
        formatId(element.id),
        ...element.points.map(formatPoint),
        ...formatAttrs('line', { closed: element.closed, ...style(element) }),
      ].join(' ');

    case 'curve':
      return [
        'curve',
        formatId(element.id),
        ...element.points.map(formatPoint),
        ...formatAttrs('curve', style(element)),
      ].join(' ');

    case 'arc':
      return [
        'arc',
        formatId(element.id),
        formatPoint({ x: element.cx, y: element.cy }),
        formatNumber(element.r),
        `${formatNumber(element.startAngle)}..${formatNumber(element.endAngle)}`,
        ...formatAttrs('arc', style(element)),
      ].join(' ');

    case 'text':
      return [
        'text',
        formatId(element.id),
        formatPoint(element),
        formatString(element.text),
        ...formatAttrs('text', { w: element.w, ...style(element) }),
      ].join(' ');

    case 'arrow':
      return [
        'arrow',
        formatId(element.id),
        formatEndpoint(element.from, element.start),
        '->',
        formatEndpoint(element.to, element.end),
        ...(element.text === undefined ? [] : [formatString(element.text)]),
        ...formatAttrs('arrow', { head: element.head, tail: element.tail, ...style(element) }),
      ].join(' ');

    case 'portal':
      return [
        'portal',
        formatId(element.id),
        formatPoint(element),
        formatSize(element.w, element.h),
        ...(element.text === undefined ? [] : [formatString(element.text)]),
        ...formatAttrs('portal', { ref: element.ref, ...style(element) }),
      ].join(' ');
  }
};

const block = (header: string, elements: readonly Scene.Element[]): string =>
  [`${header} {`, ...elements.map((element) => `  ${formatElement(element)}`), '}'].join('\n');

export const formatObject = (object: Scene.WorldObject): string =>
  block(
    [
      'object',
      formatId(object.id),
      ...(object.origin === undefined ? [] : ['@', formatPoint(object.origin)]),
      ...OBJECT_ATTRS.flatMap(({ name, type }) => {
        const value = { scale: object.scale, index: object.index, ref: object.ref }[name];
        if (value === undefined) {
          return [];
        }
        return [`${name}=${type === 'string' && typeof value === 'string' ? formatString(value) : String(value)}`];
      }),
    ].join(' '),
    object.elements,
  );

export const formatCommand = (command: Scene.Command): string => {
  switch (command.op) {
    case 'upsert-object':
      return formatObject(command.object);
    case 'upsert-elements':
      return block(`elements ${formatId(command.objectId)}`, command.elements);
    case 'move-object':
      return `move ${formatId(command.objectId)} @ ${formatPoint(command.origin)}`;
    case 'remove-object':
      return `remove object ${formatId(command.objectId)}`;
    case 'remove-elements':
      return `remove elements ${formatId(command.objectId)} ${command.elementIds.map(formatId).join(' ')}`;
  }
};

/** A whole document: statements separated by a blank line, newline-terminated. */
export const printCommands = (commands: readonly Scene.Command[]): string =>
  commands.length === 0 ? '' : `${commands.map(formatCommand).join('\n\n')}\n`;

/** A scene document — every statement an `object`, which is what a drawing serializes to. */
export const print = (scene: Scene.Scene): string =>
  printCommands(scene.objects.map((object) => ({ op: 'upsert-object', object }) as const));
