//
// Copyright 2026 DXOS.org
//

// Readers of what a drawing stored before version 0.2.0 of the stored types, when a style named a hue and a tone apart, a node had a
// `type` and a `class`, and a port sat on a side at an offset. Each takes the stored shape, in either spelling, and
// returns the current one, so a reader may run it over a record whatever revision wrote it.

import * as Schema from 'effect/Schema';

import { DEFAULT_COLOR, formatColor } from './color.ts';
import { LEGACY_PARAMS, LINK_KIND, LINK_PATHS, MARKERS, type Side, Style2D, sidePort } from './element.ts';
import {
  Constraint,
  Element2D,
  Element3D,
  ElementRecord2D,
  ElementRecord3D,
  type LayoutRecord,
  type ModelRecord,
  Object2D,
  Object3D,
  type SceneDocument,
} from './Scene.ts';
import { NamedStyle2D, NamedStyle3D, Style3D } from './style.ts';
import { CORNERS, FILLS, SIDES, STROKES } from './vocabulary.ts';

type Fields = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const without = (fields: Fields, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)));

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.find((candidate) => candidate === value);

/** The fields a style had before version 0.2.0, each of which another field now says. */
const LEGACY_STYLE_FIELDS = [
  'hue',
  'tone',
  'textHue',
  'textTone',
  'lineStyle',
  'border',
  'pattern',
  'rounded',
  'fontFamily',
  'alignHorizontal',
  'alignVertical',
  'surface',
];

/** A hue and a tone as the one colour that states both; the look's own colour stands in for a tone with no hue. */
const colorOf = (hue: unknown, tone: unknown): string | undefined => {
  const name = typeof hue === 'string' && hue.length > 0 ? hue : undefined;
  const level = typeof tone === 'number' ? tone : undefined;
  return name === undefined && level === undefined ? undefined : formatColor(name ?? DEFAULT_COLOR, level);
};

/** The fill a boolean `fill`, a `pattern` flag or a 3D `surface` said. */
const fillOf = (style: Fields): string | undefined => {
  if (typeof style.fill === 'string') {
    return oneOf(FILLS, style.fill);
  }
  if (style.fill === false) {
    return 'none';
  }
  if (style.pattern === true) {
    return 'pattern';
  }
  return style.fill === true ? 'solid' : oneOf(FILLS, style.surface);
};

/** The stroke a `lineStyle` and a `border` flag said: no border is no stroke, and a border drawn is at least solid. */
const strokeOf = (style: Fields): string | undefined => {
  if (style.border === false) {
    return 'none';
  }
  return (
    oneOf(STROKES, style.lineStyle) ?? oneOf(STROKES, style.stroke) ?? (style.border === true ? 'solid' : undefined)
  );
};

const cornersOf = (style: Fields): string | undefined =>
  typeof style.rounded === 'boolean' ? (style.rounded ? 'all' : 'none') : oneOf(CORNERS, style.corners);

/** A font slot for a family name: the fixed-width face is `mono`, and the default is no font at all. */
const fontOf = (style: Fields): string | undefined =>
  style.fontFamily === 'monospace'
    ? 'mono'
    : typeof style.font === 'string' && style.fontFamily === undefined
      ? style.font
      : undefined;

/**
 * A style of either dimension in the current words. A style already in them is returned with the same fields, so
 * this may run over a style whatever revision wrote it.
 */
export const upgradeStyle = (style: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(style)) {
    return undefined;
  }
  const stated = {
    color: colorOf(style.hue, style.tone) ?? style.color,
    textColor: colorOf(style.textHue, style.textHue === undefined ? undefined : style.textTone) ?? style.textColor,
    stroke: strokeOf(style),
    fill: fillOf(style),
    corners: cornersOf(style),
    font: fontOf(style),
    align: style.alignHorizontal ?? style.align,
    valign: style.alignVertical ?? style.valign,
  };
  return {
    ...without(style, [...LEGACY_STYLE_FIELDS, ...Object.keys(stated)]),
    ...Object.fromEntries(Object.entries(stated).filter(([, value]) => value !== undefined)),
  };
};

const LEGACY_SIDES: Readonly<Record<string, Side>> = { n: 'top', e: 'right', s: 'bottom', w: 'left' };

/** A side in the current words; one already in them is returned as it is. */
export const upgradeSide = (side: unknown): Side | undefined =>
  typeof side === 'string' ? (LEGACY_SIDES[side] ?? oneOf(SIDES, side)) : undefined;

/** A port as a point of its node's frame; one stored on a side at an offset sits where that put it. */
export const upgradePort = (port: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(port) || typeof port.id !== 'string') {
    return undefined;
  }
  const side = upgradeSide(port.side);
  if (typeof port.x === 'number' && typeof port.y === 'number') {
    return { ...port, ...(side ? { side } : {}) };
  }
  if (!side || typeof port.offset !== 'number') {
    return undefined;
  }
  return { ...without(port, ['side', 'offset']), ...sidePort(port.id, side, port.offset) };
};

/** Whether `overrides` holds a placed composite's per-part values, which every revision before 3 called `overrides`. */
const isPartOverrides = (overrides: unknown): overrides is Readonly<Record<string, Fields>> =>
  isRecord(overrides) && Object.keys(overrides).length > 0 && Object.values(overrides).every(isRecord);

/**
 * The fields a node and a part's override share, in the current words: the named style, the node's own look, a
 * placed composite's per-part values, and the ports.
 */
const upgradeShared = (fields: Fields): Record<string, unknown> => {
  // The per-part values are read before the own look takes their old name.
  const parts = isPartOverrides(fields.overrides) ? fields.overrides : fields.partOverrides;
  const look = isRecord(fields.style) ? fields.style : isPartOverrides(fields.overrides) ? undefined : fields.overrides;
  const name =
    typeof fields.class === 'string' ? fields.class : typeof fields.style === 'string' ? fields.style : undefined;
  const overrides = upgradeStyle(look);
  return {
    ...without(fields, ['class', 'style', 'overrides', 'partOverrides', 'ports']),
    ...(name !== undefined ? { style: name } : {}),
    ...(overrides && Object.keys(overrides).length > 0 ? { overrides } : {}),
    ...(isRecord(parts)
      ? {
          partOverrides: Object.fromEntries(
            Object.entries(parts).map(([id, part]) => [id, isRecord(part) ? upgradePart(part) : part]),
          ),
        }
      : {}),
    ...(Array.isArray(fields.ports) ? { ports: fields.ports.flatMap((port) => upgradePort(port) ?? []) } : {}),
  };
};

/** The values a placed composite sets on one of its parts: a patch of that part's fields, whatever kind it is. */
const upgradePart = (part: Fields): Record<string, unknown> => {
  const { text, ...rest } = upgradeShared(part);
  // A part's text is its label whatever its kind, so a patch that set a note's `text` sets its label.
  return {
    ...rest,
    ...(text !== undefined && rest.label === undefined ? { label: text } : text !== undefined ? { text } : {}),
  };
};

/**
 * A node as the 2D editor holds one, in the current words: its `kind`, its named `style` and own `overrides`, its
 * ports as points of its frame, a note's text as its `label`, and a path's exact colour as its own colour.
 */
export const upgradeNode = (node: Fields): Record<string, unknown> => {
  const { type, text, ...rest } = upgradeShared(node);
  const kind = typeof rest.kind === 'string' ? rest.kind : type;
  const upgraded: Record<string, unknown> = withParams(kind, { ...rest, ...(kind !== undefined ? { kind } : {}) });
  if (text !== undefined) {
    // Only a note kept its text apart from `label`; any other kind's `text` is its own field.
    Object.assign(upgraded, kind === 'note' && upgraded.label === undefined ? { label: text } : { text });
  }
  if (kind === 'path' && typeof upgraded.fill === 'string') {
    const { fill, ...path } = upgraded;
    return { ...path, overrides: { ...(isRecord(path.overrides) ? path.overrides : {}), color: fill } };
  }
  // A diagram node holds the shape it draws, which has words of its own to bring up to date.
  return kind === 'diagram' && isRecord(upgraded.element)
    ? { ...upgraded, element: upgradeShape(upgraded.element) }
    : upgraded;
};

/** A node with the settings its kind once kept beside the shared fields in its `params`, where a later value wins. */
const withParams = (kind: unknown, node: Record<string, unknown>): Record<string, unknown> => {
  const keys = (typeof kind === 'string' ? (LEGACY_PARAMS[kind] ?? []) : []).filter((key) => key in node);
  if (keys.length === 0) {
    return node;
  }
  const lifted = Object.fromEntries(keys.map((key) => [key, node[key]]));
  return { ...without(node, keys), params: { ...lifted, ...(isRecord(node.params) ? node.params : {}) } };
};

/** The diagram shapes that have an outline of their own, which a `border` flag once switched. */
const CLOSED_SHAPES: readonly string[] = ['rect', 'ellipse', 'diamond', 'triangle', 'grid', 'circle', 'text', 'portal'];

/**
 * A diagram shape in the current words: a `border` flag as its `stroke`, on a shape that has an outline to draw, and
 * the component it stands for as `component`, which was `type`. A line, a curve, an arc and an arrow never read the
 * flag, so it is dropped from them rather than hiding their line.
 */
export const upgradeShape = (shape: Fields): Record<string, unknown> => {
  if (shape.border === undefined && shape.type === undefined) {
    return { ...shape };
  }
  const { border, type, ...rest } = shape;
  const closed = typeof shape.kind === 'string' && CLOSED_SHAPES.includes(shape.kind);
  const stroke = closed ? upgradeStyle({ stroke: shape.stroke, border })?.stroke : shape.stroke;
  return {
    ...rest,
    ...(stroke !== undefined ? { stroke } : {}),
    ...(type !== undefined && rest.component === undefined ? { component: type } : {}),
  };
};

/** A marker in the current words. */
const upgradeMarker = (marker: unknown) => (marker === 'many' ? 'crowsfoot' : oneOf(MARKERS, marker));

/**
 * A link as the 2D editor holds one, in the current words: every link is of the kind `link` and how it runs is its
 * `path`, its end markers are its `tail` and `head`, and its caption is its `label`.
 */
export const upgradeLink = (link: Fields): Record<string, unknown> => {
  const { type, ends, text, kind: _kind, ...rest } = upgradeShared(link);
  const path = oneOf(LINK_PATHS, rest.path) ?? oneOf(LINK_PATHS, type);
  const tail = upgradeMarker(isRecord(ends) ? ends.start : rest.tail);
  const head = upgradeMarker(isRecord(ends) ? ends.end : rest.head);
  const label = rest.label ?? text;
  return {
    ...without(rest, ['path', 'tail', 'head', 'label']),
    kind: LINK_KIND,
    ...(path !== undefined ? { path } : {}),
    ...(tail !== undefined ? { tail } : {}),
    ...(head !== undefined ? { head } : {}),
    ...(label !== undefined ? { label } : {}),
  };
};

/** A node or a link as the 2D editor holds one, in the current words; a record with two ends is a link. */
export const upgradeNodeOrLink = (element: Fields): Record<string, unknown> =>
  'source' in element && 'target' in element ? upgradeLink(element) : upgradeNode(element);

/** A named style of the 2D editor (`StyleClass`) in the current words. */
export const upgradeStyleClass = (styleClass: Fields): Record<string, unknown> => {
  const style = upgradeStyle(styleClass.style);
  return { ...without(styleClass, ['style']), ...(style && Object.keys(style).length > 0 ? { style } : {}) };
};

const LEGACY_PLACEMENTS: Readonly<Record<string, string>> = {
  east: 'right-of',
  west: 'left-of',
  north: 'above',
  south: 'below',
};

/** A layout constraint in the current words. */
export const upgradeConstraint = (constraint: Fields): Record<string, unknown> => ({
  ...constraint,
  ...(typeof constraint.relation === 'string' && LEGACY_PLACEMENTS[constraint.relation] !== undefined
    ? { relation: LEGACY_PLACEMENTS[constraint.relation] }
    : {}),
});

//
// Stored records.
//

/** Whether a style states anything in the words version 0.2.0 dropped. */
const isLegacyStyle = (style: unknown): boolean =>
  isRecord(style) &&
  (typeof style.fill === 'boolean' || Object.keys(style).some((field) => LEGACY_STYLE_FIELDS.includes(field)));

/** The bag the 2D editor kept a node's or a link's own fields in before an element held them itself. */
const canvasBag = (element: Fields): Fields | undefined =>
  isRecord(element.props) && isRecord(element.props.canvas) ? element.props.canvas : undefined;

/** Whether a stored element or object was written before version 0.2.0. */
const isLegacy = (record: Fields): boolean =>
  'type' in record ||
  canvasBag(record) !== undefined ||
  isLegacyStyle(record.overrides) ||
  (isRecord(record.element) && (record.element.border !== undefined || record.element.type !== undefined));

const nonEmpty = (fields: Record<string, unknown> | undefined): Record<string, unknown> | undefined =>
  fields && Object.keys(fields).length > 0 ? fields : undefined;

/**
 * A stored element in the current words, as plain fields: its `kind`, its look, and, where the 2D editor wrote it,
 * every field of its node or link beside the base rather than in a bag under `props.canvas`. A field the element
 * itself states wins over the bag's, as it did when the bag was read; a note's text and a free link end are the two
 * the bag alone held.
 */
export const upgradeElement = (element: Fields): Record<string, unknown> => {
  const { type, props, overrides, ...rest } = element;
  const bag = canvasBag(element);
  const stated = typeof rest.kind === 'string' ? rest.kind : typeof type === 'string' ? type : undefined;
  const otherProps = nonEmpty(isRecord(props) ? without(props, ['canvas']) : undefined);
  const own = upgradeStyle(overrides);
  if (!bag) {
    const look = nonEmpty(own);
    return {
      ...rest,
      ...(stated !== undefined ? { kind: stated } : {}),
      ...(look ? { overrides: look } : {}),
      ...(otherProps ? { props: otherProps } : {}),
    };
  }
  const isLink = stated === LINK_KIND;
  // A node the element names the kind of has none in its bag, and the bag's readers need it to read a note's text.
  const named =
    bag.type === undefined && bag.kind === undefined && stated !== undefined ? { ...bag, type: stated } : bag;
  const { overrides: bagLook, source, target, label, ...all } = isLink ? upgradeLink(named) : upgradeNode(named);
  // A field the element's other props hold is theirs alone, so the bag's copy of it is not kept beside it.
  const extras = without(all, Object.keys(otherProps ?? {}));
  const kind = typeof extras.kind === 'string' ? extras.kind : stated;
  const look = nonEmpty({ ...(isRecord(bagLook) ? bagLook : {}), ...own });
  // Only a note kept its text in the bag, where it won over the element's label.
  const text = kind === 'note' && label !== undefined ? label : (rest.label ?? label);
  return {
    ...extras,
    ...rest,
    ...(kind !== undefined ? { kind } : {}),
    ...(text !== undefined ? { label: text } : {}),
    ...(look ? { overrides: look } : {}),
    ...(rest.source === undefined && source !== undefined ? { source } : {}),
    ...(rest.target === undefined && target !== undefined ? { target } : {}),
    ...(otherProps ? { props: otherProps } : {}),
  };
};

/** A guard per declared field of a struct, made once. */
export const fieldGuards = (fields: Schema.Struct.Fields): ReadonlyMap<string, (value: unknown) => boolean> =>
  new Map(Object.entries(fields).map(([name, field]) => [name, Schema.is(field)]));

/**
 * The upgraded fields where they are a valid record; else without each declared field whose value its schema does
 * not take (a colour that is no colour, say); else `stored`. One bad field must not hide a whole element.
 */
export const validated = <T, S>(
  is: (value: unknown) => value is T,
  guards: ReadonlyMap<string, (value: unknown) => boolean>,
  stored: S,
  upgraded: Record<string, unknown>,
): T | S => {
  if (is(upgraded)) {
    return upgraded;
  }
  const kept = Object.fromEntries(
    Object.entries(upgraded).filter(([name, value]) => guards.get(name)?.(value) ?? true),
  );
  return is(kept) ? kept : stored;
};

const isElement2D = Schema.is(ElementRecord2D);
const isElement3D = Schema.is(ElementRecord3D);
const isObject2D = Schema.is(Object2D);
const isObject3D = Schema.is(Object3D);
const isConstraint = Schema.is(Constraint);

/** The declared fields of each stored record, for {@link validated}. */
export const ELEMENT_2D_GUARDS = fieldGuards(Element2D.fields);
export const ELEMENT_3D_GUARDS = fieldGuards(Element3D.fields);
export const OBJECT_2D_GUARDS = fieldGuards(Object2D.fields);
export const OBJECT_3D_GUARDS = fieldGuards(Object3D.fields);

/**
 * A stored 2D element in the current words; one already in them is returned as it is. It takes any record, since
 * what was stored before version 0.2.0 is not an element by the current schema.
 */
export const upgradeElement2D = <E extends Fields>(element: E): E | ElementRecord2D =>
  isLegacy(element) ? validated(isElement2D, ELEMENT_2D_GUARDS, element, upgradeElement(element)) : element;

/** A stored 3D element in the current words; one already in them is returned as it is. */
export const upgradeElement3D = <E extends Fields>(element: E): E | ElementRecord3D =>
  isLegacy(element) ? validated(isElement3D, ELEMENT_3D_GUARDS, element, upgradeElement(element)) : element;

/** A model object in the current words: its `kind` and its look. */
export const upgradeObject = (object: Fields): Record<string, unknown> => {
  const { type, overrides, ...rest } = object;
  const look = nonEmpty(upgradeStyle(overrides));
  const kind = typeof rest.kind === 'string' ? rest.kind : type;
  return { ...rest, ...(kind !== undefined ? { kind } : {}), ...(look ? { overrides: look } : {}) };
};

const upgradeStyles = <S extends Fields>(
  is: (value: unknown) => value is S,
  styles: Readonly<Record<string, S>> | undefined,
): { styles?: Record<string, S> } => {
  if (!styles || !Object.values(styles).some(isLegacyStyle)) {
    return {};
  }
  return {
    styles: Object.fromEntries(
      Object.entries(styles).map(([id, style]) => {
        const upgraded = upgradeStyle(style);
        return [id, is(upgraded) ? upgraded : style];
      }),
    ),
  };
};

const isStyle2D = Schema.is(Style2D);
const isStyle3D = Schema.is(Style3D);
const isNamedStyle2D = Schema.is(NamedStyle2D);
const isNamedStyle3D = Schema.is(NamedStyle3D);

/** A layout in the current words: its elements, its overrides of the named styles, and its constraints. */
export const upgradeLayoutRecord = <L extends LayoutRecord>(layout: L): L => {
  if (layout.dim === '2d') {
    const constraints = layout.constraints?.map((constraint) => {
      const upgraded = upgradeConstraint(constraint);
      return isConstraint(upgraded) ? upgraded : constraint;
    });
    return {
      ...layout,
      elements: Object.fromEntries(
        Object.entries(layout.elements).map(([id, element]) => [id, upgradeElement2D(element)]),
      ),
      ...upgradeStyles(isStyle2D, layout.styles),
      ...(constraints ? { constraints } : {}),
    };
  }
  return {
    ...layout,
    elements: Object.fromEntries(
      Object.entries(layout.elements).map(([id, element]) => [id, upgradeElement3D(element)]),
    ),
    ...upgradeStyles(isStyle3D, layout.styles),
  };
};

/** A model in the current words: its objects and its named styles. */
export const upgradeModelRecord = <M extends ModelRecord>(model: M): M => {
  if (model.dim === '2d') {
    return {
      ...model,
      objects: Object.fromEntries(
        Object.entries(model.objects).map(([id, object]) => [
          id,
          isLegacy(object) ? validated(isObject2D, OBJECT_2D_GUARDS, object, upgradeObject(object)) : object,
        ]),
      ),
      ...upgradeStyles(isNamedStyle2D, model.styles),
    };
  }
  return {
    ...model,
    objects: Object.fromEntries(
      Object.entries(model.objects).map(([id, object]) => [
        id,
        isLegacy(object) ? validated(isObject3D, OBJECT_3D_GUARDS, object, upgradeObject(object)) : object,
      ]),
    ),
    ...upgradeStyles(isNamedStyle3D, model.styles),
  };
};

/** A document in the current words; a scene has none of its own to change. */
export const upgradeDocument = (doc: SceneDocument): SceneDocument => ({
  scenes: doc.scenes,
  layouts: doc.layouts.map(upgradeLayoutRecord),
  models: doc.models.map(upgradeModelRecord),
});
