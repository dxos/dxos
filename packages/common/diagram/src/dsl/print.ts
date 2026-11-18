//
// Copyright 2026 DXOS.org
//

//
// Canonical text for a scene. The form is fixed — two-space indent, one element per line, a blank
// line between statements, attributes in the order `vocabulary.ts` lists them — because
// `parse(print(x))` round-tripping is only worth anything if the text side is normalized too.
//

import { Shape } from '@dxos/scene';

import type * as Scene from '../scene.ts';
import { BARE_ID, BARE_REF, ELEMENT_ATTRS, OBJECT_ATTRS, RESERVED, dataAttrName } from './vocabulary.ts';

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
  // Decimal, never a fraction. The grammar accepts `692/3` so a person or an agent can SAY a quotient exactly, but
  // printing one would emit text an older parser rejects, and the DSL carries no version to negotiate that on.
  // Printing fractions belongs with a versioned DSL, not before it.
  return String(value);
};

export const formatString = (value: string): string =>
  `"${value.replace(/[\\"\n\t\r]/g, (character) => ESCAPES[character] ?? character)}"`;

/** Bare where the grammar allows it, quoted where a word would be read as a keyword or fail to lex. */
export const formatId = (id: string): string => (BARE_ID.test(id) && !RESERVED.has(id) ? id : formatString(id));

const formatPoint = ({ x, y }: Shape.Point): string => `${formatNumber(x)},${formatNumber(y)}`;

const formatSize = (w: number, h: number): string => `${formatNumber(w)}x${formatNumber(h)}`;

/**
 * Quoted unless every id in it is a bare word: a dialect may build a ref from a node id the
 * grammar cannot lex, such as mermaid's `1st` becoming `1st/box`, and an unquoted one would make
 * the printed scene fail to parse.
 */
const formatRef = (ref: string): string => (BARE_REF.test(ref) && !RESERVED.has(ref) ? ref : formatString(ref));

/** `_` is the end the schema leaves unset; a bound end prints as its ref, a free one as a point. */
const formatEndpoint = (ref: string | undefined, point: Shape.Point | undefined): string =>
  ref !== undefined ? formatRef(ref) : point !== undefined ? formatPoint(point) : '_';

type AttrValue = string | number | boolean;

/** A scalar in the form the parser reads back as the same value; `true`/`false` quoted so a string stays one. */
const formatScalar = (value: AttrValue): string =>
  typeof value === 'string'
    ? BARE_ID.test(value) && value !== 'true' && value !== 'false' && !RESERVED.has(value)
      ? value
      : formatString(value)
    : String(value);

/** Prints `name=value` for the attributes of `kind` that are set, in the table's order. */
const formatAttrs = (kind: keyof typeof ELEMENT_ATTRS, values: Partial<Record<string, AttrValue>>): string[] =>
  ELEMENT_ATTRS[kind].flatMap(({ name, type }) => {
    const value = values[name];
    if (value === undefined) {
      return [];
    }
    if (type === 'string' && typeof value === 'string') {
      return [`${name}=${formatString(value)}`];
    }
    return [`${name}=${type === 'name' || type === 'scalar' ? formatScalar(value) : String(value)}`];
  });

/**
 * A contributed kind's own fields, flat and by key so the text is stable. Two are left out, because writing them
 * would say something false rather than nothing:
 *
 * - a field holding a list or a nested object, which has no spelling in the DSL at all — printed as a string it
 *   would read back as that string;
 * - a field whose name the element's own table already claims (`substrate`'s numeric `fill` against the style
 *   attribute), or that the grammar reserves (`text`), is written with the {@link DATA_PREFIX}: the reader would
 *   otherwise resolve the name against the schema's literals, or fail to parse it as an attribute name at all;
 * - a field whose name is not a bare word (`font.size`) has no spelling and no escape, since a prefix leaves it
 *   just as unparseable, so it is left out as a value the DSL cannot spell is.
 *
 * The first is measured by the handler's conformance test rather than assumed away.
 */
const formatData = (
  kind: keyof typeof ELEMENT_ATTRS,
  data: Readonly<Record<string, unknown>> | undefined,
): string[] => {
  const claimed = new Set(ELEMENT_ATTRS[kind].map(({ name }) => name));
  return Object.entries(data ?? {})
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .flatMap(([name, value]) => {
      const attr = dataAttrName(name, claimed);
      return attr !== undefined &&
        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        ? [`${attr}=${formatScalar(value)}`]
        : [];
    });
};

const style = ({
  color,
  fill,
  stroke,
  weight,
  border,
  align,
  valign,
  fontSize,
}: Shape.Element): Partial<Record<string, AttrValue>> => ({
  color,
  fill,
  stroke,
  weight,
  border,
  align,
  valign,
  fontSize,
});

/** `nested`: the element is written inside its grid's braces, so its `parent` is already said by where it sits. */
export const formatElement = (element: Shape.Element, { nested = false }: { nested?: boolean } = {}): string => {
  switch (element.kind) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle':
    case 'grid':
      return [
        element.kind,
        formatId(element.id),
        // A child the braces place states neither: its frame is the rule's result, re-solved on every render, and
        // writing it down would be a coordinate that the next solve contradicts.
        ...(nested ? [] : [formatPoint(element), formatSize(element.w, element.h)]),
        ...(element.text === undefined ? [] : [formatString(element.text)]),
        ...formatAttrs(element.kind, {
          kind: element.type,
          rotation: element.rotation,
          corners: element.corners,
          cols: element.cols,
          rows: element.rows,
          gap: element.gap,
          padding: element.padding,
          parent: nested ? undefined : element.parent,
          ...style(element),
        }),
        ...formatData(element.kind, element.data),
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
        ...formatAttrs('line', { closed: element.closed, guide: element.guide, ...style(element) }),
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
        // The bends come before the attributes, as they do on a semantic edge: the route is part of what the
        // connector IS, and an attribute after it still reads as the arrow's.
        ...(element.route?.length ? ['via', ...element.route.map(formatPoint)] : []),
        ...formatAttrs('arrow', {
          head: element.head,
          tail: element.tail,
          relation: element.relation,
          ...style(element),
        }),
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

/**
 * A body, with each grid's children nested inside it. `parent` is the model's word for containment and braces are
 * the text's, so a child written here drops the attribute: saying it twice would let the two disagree. An element
 * naming a parent that is not a grid of this object stays at the top level, where its `parent` still prints —
 * otherwise it would simply vanish from the text.
 */
const block = (header: string, elements: readonly Shape.Element[]): string => {
  const grids = new Set(elements.filter((element) => element.kind === 'grid').map((element) => element.id));
  const childrenOf = new Map<string, Shape.Element[]>();
  for (const element of elements) {
    const parent = 'parent' in element ? element.parent : undefined;
    if (parent !== undefined && grids.has(parent)) {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), element]);
    }
  }
  const placed = new Set([...childrenOf.values()].flat().map((element) => element.id));

  const lines = (element: Shape.Element, depth: number): string[] => {
    const indent = '  '.repeat(depth);
    const children = childrenOf.get(element.id);
    const text = formatElement(element, { nested: placed.has(element.id) });
    if (!children?.length) {
      return [`${indent}${text}`];
    }
    return [`${indent}${text} {`, ...children.flatMap((child) => lines(child, depth + 1)), `${indent}}`];
  };

  return [
    `${header} {`,
    ...elements.filter((element) => !placed.has(element.id)).flatMap((element) => lines(element, 1)),
    '}',
  ].join('\n');
};

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
