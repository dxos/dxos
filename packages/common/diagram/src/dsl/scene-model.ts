//
// Copyright 2026 DXOS.org
//

import type { SyntaxNode } from '@lezer/common';

import {
  type ElementEndpoint,
  Scene as Model,
  type Part,
  type Style2D,
  type Style3D,
  applyArrangement,
  flattenStyle,
  layoutTree,
  liftStyle,
  validateDocument,
} from '@dxos/scene';

import { parser } from './gen/diagram.ts';
import { type Problem, type Range, childrenOf, optional, unquote } from './parse.ts';
import { formatId, formatNumber, formatString } from './print.ts';
import { BARE_ID } from './vocabulary.ts';

/** A value an attribute can carry, as read from its `AttrValue`. */
export type AttrValue = number | string | boolean | Model.Vec2 | Model.Vec3 | Model.Size2;

const DEFAULT_CAMERA_2D: Model.Camera2D = { center: { x: 0, y: 0 }, zoom: 1 };
const DEFAULT_CAMERA_3D: Model.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: -45,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

const STYLE_KEYS = ['hue', 'tone', 'surface', 'border', 'rounded', 'opacity'] as const;
const SURFACES = ['solid', 'tint', 'glass', 'none'] as const;
const TONES = [0, 1, 2, 3] as const;
const ARRANGE_PARAM = 'arrange-';

/** Suffix of the model the reader makes for a layout with groups and no model of its own; the printer leaves it out. */
const GROUPS_MODEL = '/groups';

/** A `group` statement's members and arrangement, read before they become a composite. */
type GroupSpec = { readonly members: readonly string[]; readonly arrange?: Model.Arrangement };

/** What printing a layout's elements needs: the composite each of its groups places, by element id. */
type LayoutContext = { readonly groups: ReadonlyMap<string, Model.LayoutRecord> };

const byId = <T extends { readonly id: string }>(items: readonly T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

/** `element` with its centre moved by `center` times `sign`, so members move between a layout's units and a group's. */
const offsetCenter = <E extends Model.Element2D | Model.Element3D>(
  element: E,
  center: E['center'],
  sign: 1 | -1,
): E => {
  if (!center || !element.center) {
    return element;
  }
  const at = (axis: 'x' | 'y' | 'z') =>
    formatRound(Number(Reflect.get(element.center ?? {}, axis)) + sign * Number(Reflect.get(center, axis)));
  return { ...element, center: 'z' in center ? { x: at('x'), y: at('y'), z: at('z') } : { x: at('x'), y: at('y') } };
};

const formatRound = (value: number): number => Math.round(value * 1000) / 1000 + 0;

/**
 * A layout's `group` statements as composites (decision 17): each group's members move into its composite, relative to
 * the group's centre, the group becomes an element placing the composite with no fit, and a link to a member ends on
 * the group's port of that name. A member that is itself a group stays where it is.
 */
const groupElements = <E extends Model.Element2D | Model.Element3D>(
  elements: Readonly<Record<string, E>>,
  groups: ReadonlyMap<string, GroupSpec>,
  composite: (id: string) => string,
  place: (group: E, object: string) => E,
): { elements: Record<string, E>; parts: Map<string, Record<string, E>> } => {
  const groupOf = new Map<string, string>();
  for (const [id, spec] of groups) {
    for (const member of spec.members) {
      elements[member] && !groups.has(member) && !groupOf.has(member) && groupOf.set(member, id);
    }
  }
  const toPort = (end: ElementEndpoint | undefined): ElementEndpoint | undefined => {
    const group = end?.node === undefined ? undefined : groupOf.get(end.node);
    return group && end?.node !== undefined ? { node: group, port: end.node } : end;
  };
  const outside: Record<string, E> = {};
  for (const [key, element] of Object.entries(elements)) {
    if (groupOf.has(key)) {
      continue;
    }
    if (groups.has(key)) {
      outside[key] = place(element, composite(key));
    } else {
      outside[key] =
        element.source || element.target
          ? { ...element, source: toPort(element.source), target: toPort(element.target) }
          : element;
    }
  }
  const parts = new Map(
    [...groups.keys()].map((id) => [
      id,
      Object.fromEntries(
        [...groupOf]
          .filter(([, group]) => group === id)
          .map(([member]) => [member, offsetCenter(elements[member], elements[id]?.center, -1)]),
      ),
    ]),
  );
  return { elements: outside, parts };
};

const isVec2 = (value: AttrValue | undefined): value is Model.Vec2 =>
  typeof value === 'object' && 'x' in value && !('z' in value);
const isVec3 = (value: AttrValue | undefined): value is Model.Vec3 => typeof value === 'object' && 'z' in value;
const isSize2 = (value: AttrValue | undefined): value is Model.Size2 => typeof value === 'object' && 'width' in value;
const asNumber = (value: AttrValue | undefined): number | undefined => (typeof value === 'number' ? value : undefined);
const asString = (value: AttrValue | undefined): string | undefined =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;
const asBoolean = (value: AttrValue | undefined): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const parseBinding = (value: AttrValue | undefined): ElementEndpoint | undefined => {
  const text = asString(value);
  if (text === undefined) {
    return undefined;
  }
  const [node, port] = text.split('#');
  return port === undefined ? { node } : { node, port };
};

/** The style tokens the text form writes, shared by both dimensions; each dimension reads them into its own style. */
type StyleTokens = {
  hue?: string;
  tone?: (typeof TONES)[number];
  surface?: (typeof SURFACES)[number];
  border?: boolean;
  rounded?: boolean;
  opacity?: number;
};

/** A 3D style's tokens: the text form writes only the shared ones. */
const tokensOf3D = (style: Style3D | undefined): StyleTokens => {
  const { hue, tone, surface, border, rounded, opacity } = style ?? {};
  return Object.fromEntries(
    Object.entries({ hue, tone, surface, border, rounded, opacity }).filter(([, value]) => value !== undefined),
  );
};

/** A 2D style's tokens: its fill as a surface (the shared mapping in `liftStyle`). */
const tokensOf2D = (style: Style2D | undefined): StyleTokens => tokensOf3D(style && liftStyle(style));

/**
 * Reads every `scene`, `layout` and `model` block into the record form of `@dxos/scene`, arranges 3D group members that
 * have no position yet, and reports grammar errors and document problems. Other statements belong to `read`.
 */
export const readScenes = (text: string): { document: Model.SceneDocument; problems: Problem[] } => {
  const problems: Problem[] = [];
  const ranges = new Map<string, Range>();
  const slice = (node: SyntaxNode) => text.slice(node.from, node.to);
  const report = (range: Range, message: string) =>
    problems.push({ severity: 'error', message, from: range.from, to: range.to });
  const readId = (node: SyntaxNode | null): string | undefined => {
    if (!node) {
      return undefined;
    }
    const raw = slice(node);
    return raw.startsWith('"') ? unquote(raw) : raw;
  };
  const numbers = (node: SyntaxNode) =>
    childrenOf(node)
      .filter((child) => child.name === 'Number')
      .map((child) => Number.parseFloat(slice(child)));

  const readValue = (node: SyntaxNode): AttrValue | undefined => {
    const value = node.firstChild;
    if (!value) {
      return undefined;
    }
    const raw = slice(value);
    switch (value.name) {
      case 'Number':
        return Number.parseFloat(raw);
      case 'String':
        return unquote(raw);
      case 'Word':
        return raw === 'true' ? true : raw === 'false' ? false : raw;
      case 'Dimension':
        return raw;
      case 'Size': {
        const [width, height] = raw.split('x').map(Number.parseFloat);
        return { width, height };
      }
      case 'Size3': {
        const [x, y, z] = raw.split('x').map(Number.parseFloat);
        return { x, y, z };
      }
      case 'Point': {
        const [x, y] = numbers(value);
        return { x, y };
      }
      case 'Point3': {
        const [x, y, z] = numbers(value);
        return { x, y, z };
      }
      default:
        report(value, `"${raw}" is not a value a scene attribute takes.`);
        return undefined;
    }
  };

  const readAttrs = (node: SyntaxNode): Map<string, AttrValue> => {
    const attrs = new Map<string, AttrValue>();
    for (const attribute of childrenOf(node).filter((child) => child.name === 'Attribute')) {
      const name = attribute.getChild('AttrName');
      const value = attribute.getChild('AttrValue');
      const read = value ? readValue(value) : undefined;
      if (name && read !== undefined) {
        attrs.set(slice(name), read);
      }
    }
    return attrs;
  };

  const readStyle = (attrs: Map<string, AttrValue>, range: Range): StyleTokens | undefined => {
    const style: StyleTokens = {};
    const hue = asString(attrs.get('hue'));
    hue !== undefined && (style.hue = hue);
    const tone = TONES.find((candidate) => candidate === attrs.get('tone'));
    tone !== undefined && (style.tone = tone);
    if (attrs.has('surface')) {
      const surface = SURFACES.find((candidate) => candidate === attrs.get('surface'));
      surface ? (style.surface = surface) : report(range, `surface must be one of ${SURFACES.join(', ')}.`);
    }
    const border = asBoolean(attrs.get('border'));
    border !== undefined && (style.border = border);
    const rounded = asBoolean(attrs.get('rounded'));
    rounded !== undefined && (style.rounded = rounded);
    const opacity = asNumber(attrs.get('opacity'));
    opacity !== undefined && (style.opacity = opacity);
    return Object.keys(style).length > 0 ? style : undefined;
  };

  /** The fields every element shares, read from its statement; geometry is the caller's. */
  const readBase = (statement: SyntaxNode, attrs: Map<string, AttrValue>, objects: ReadonlySet<string>) => {
    const id = readId(statement.getChild('Id')) ?? '';
    // The word after the id names an object of the layout's model when there is one of that id, and a kind otherwise.
    const word = slice(statement.getChild('Word') ?? statement);
    const labelNode = statement.getChild('Label');
    const style = readStyle(attrs, statement);
    const arrangeParams = Object.fromEntries(
      [...attrs]
        .filter(([key]) => key.startsWith(ARRANGE_PARAM))
        .map(([key, value]) => [key.slice(ARRANGE_PARAM.length), value]),
    );
    const arrangeKind = asString(attrs.get('arrange'));
    const members = asString(attrs.get('members'))?.split(/\s+/).filter(Boolean);
    const props = readProps(attrs, ELEMENT_KEYS);
    return {
      id,
      ...(objects.has(word) ? { object: word } : { type: word }),
      ...(labelNode ? { label: unquote(slice(labelNode)) } : {}),
      ...optionalString('z', attrs.get('order')),
      ...optionalString('layer', attrs.get('layer')),
      ...optionalBoolean('hidden', attrs.get('hidden')),
      ...optionalBoolean('locked', attrs.get('locked')),
      ...optionalBoolean('pinned', attrs.get('pinned')),
      ...(style ? { tokens: style } : {}),
      ...optionalBinding('source', attrs.get('from')),
      ...optionalBinding('target', attrs.get('to')),
      ...(members
        ? {
            group: {
              members,
              ...(arrangeKind
                ? {
                    arrange:
                      Object.keys(arrangeParams).length > 0
                        ? { kind: arrangeKind, params: arrangeParams }
                        : { kind: arrangeKind },
                  }
                : {}),
            },
          }
        : {}),
      ...(props ? { props } : {}),
    };
  };

  /** Attributes no field takes, which become `props`; arrangement parameters are the group's, not props. */
  const readProps = (attrs: Map<string, AttrValue>, keys: ReadonlySet<string>) => {
    const props = Object.fromEntries([...attrs].filter(([key]) => !keys.has(key) && !key.startsWith(ARRANGE_PARAM)));
    return Object.keys(props).length > 0 ? props : undefined;
  };

  /** A uniform `scale=2` or a per-axis `scale=2x1x0.5`. */
  const readScale = (value: AttrValue | undefined): Model.Vec3 | undefined =>
    isVec3(value) ? value : typeof value === 'number' ? { x: value, y: value, z: value } : undefined;

  const readElement2D = (
    statement: SyntaxNode,
    objects: ReadonlySet<string>,
  ): { record: Model.Element2D; group?: GroupSpec } => {
    const attrs = readAttrs(statement);
    const position = statement.getChild('Position');
    const at = position && readPosition(position);
    const size = attrs.get('size');
    const rotation = asNumber(attrs.get('rotation'));
    if (at && isVec3(at)) {
      report(position, 'A 2D element takes an x,y position.');
    }
    const { tokens, group, ...base } = readBase(statement, attrs, objects);
    const record: Model.Element2D = {
      ...base,
      ...(tokens ? { overrides: flattenStyle(tokens) } : {}),
      ...(at && isVec2(at) ? { center: at } : {}),
      ...(isSize2(size) ? { size } : {}),
      ...(rotation !== undefined ? { rotation } : {}),
    };
    return { record, group };
  };

  const readElement3D = (
    statement: SyntaxNode,
    objects: ReadonlySet<string>,
  ): { record: Model.Element3D; group?: GroupSpec } => {
    const attrs = readAttrs(statement);
    const position = statement.getChild('Position');
    const at = position && readPosition(position);
    const scale = readScale(attrs.get('scale'));
    const rotation = attrs.get('rotation');
    if (at && !isVec3(at)) {
      report(position, 'A 3D element takes an x,y,z position.');
    }
    const { tokens, group, ...base } = readBase(statement, attrs, objects);
    const record: Model.Element3D = {
      ...base,
      ...(tokens ? { overrides: tokens satisfies Style3D } : {}),
      ...(at && isVec3(at) ? { center: at } : {}),
      ...(scale ? { scale } : {}),
      ...(isVec3(rotation) ? { rotation } : {}),
    };
    return { record, group };
  };

  const readPosition = (node: SyntaxNode): Model.Vec2 | Model.Vec3 | undefined => {
    const point = node.getChild('Point3') ?? node.getChild('Point');
    if (!point) {
      return undefined;
    }
    const [x, y, z] = numbers(point);
    return point.name === 'Point3' ? { x, y, z } : { x, y };
  };

  const readCamera2D = (statement: SyntaxNode | undefined): Model.Camera2D => {
    const attrs = statement ? readAttrs(statement) : new Map<string, AttrValue>();
    const center = attrs.get('center');
    return {
      center: isVec2(center) ? center : DEFAULT_CAMERA_2D.center,
      zoom: asNumber(attrs.get('zoom')) ?? DEFAULT_CAMERA_2D.zoom,
    };
  };

  const readCamera3D = (statement: SyntaxNode | undefined): Model.Camera3D => {
    const attrs = statement ? readAttrs(statement) : new Map<string, AttrValue>();
    const target = attrs.get('target');
    const projection = attrs.get('projection') === 'orthographic' ? 'orthographic' : 'perspective';
    return {
      target: isVec3(target) ? target : DEFAULT_CAMERA_3D.target,
      yaw: asNumber(attrs.get('yaw')) ?? DEFAULT_CAMERA_3D.yaw,
      pitch: asNumber(attrs.get('pitch')) ?? DEFAULT_CAMERA_3D.pitch,
      distance: asNumber(attrs.get('distance')) ?? DEFAULT_CAMERA_3D.distance,
      fov: asNumber(attrs.get('fov')) ?? DEFAULT_CAMERA_3D.fov,
      projection,
    };
  };

  const tree = parser.parse(text);
  const cursor = tree.cursor();
  do {
    if (cursor.type.isError) {
      report(
        { from: cursor.from, to: cursor.to > cursor.from ? cursor.to : Math.min(cursor.from + 1, text.length) },
        'Unexpected input.',
      );
    }
  } while (cursor.next());

  const statementsOf = (name: string) => childrenOf(tree.topNode).filter((child) => child.name === name);
  const bodyOf = (statement: SyntaxNode, body: string, name: string) => {
    const node = statement.getChild(body);
    return node ? childrenOf(node).filter((child) => child.name === name) : [];
  };
  /** The block's id, attributes and dimension; a block with no dimension is reported and skipped. */
  const readHead = (part: Part, statement: SyntaxNode) => {
    const id = readId(statement.getChild('Id')) ?? '';
    const attrs = readAttrs(statement);
    const dim = attrs.get('dim');
    if (dim !== '2d' && dim !== '3d') {
      report(statement, `${part} "${id}" needs dim=2d or dim=3d.`);
      return undefined;
    }
    ranges.set(`${part}:${id}`, statement);
    return { id, attrs, dim, name: optionalString('name', attrs.get('name')) };
  };

  // Models first, so a layout can tell an object it places from an inline kind.
  const models: Model.ModelRecord[] = [];
  for (const statement of statementsOf('ModelDecl')) {
    const head = readHead('model', statement);
    if (!head) {
      continue;
    }
    /** The fields an object has in either dimension; its size or scale is the caller's. */
    const readObject = (object: SyntaxNode, attrs: Map<string, AttrValue>) => {
      const id = readId(object.getChild('Id')) ?? '';
      const style = readStyle(attrs, object);
      const props = readProps(attrs, OBJECT_KEYS);
      ranges.set(`model:${head.id}/${id}`, object);
      return {
        id,
        type: slice(object.getChild('Word') ?? object),
        ...optionalString('parts', attrs.get('parts')),
        ...(style ? { tokens: style } : {}),
        ...(props ? { props } : {}),
      };
    };
    const statements = bodyOf(statement, 'ModelBody', 'ModelObjectStmt');
    if (head.dim === '2d') {
      const objects: Record<string, Model.Object2D> = {};
      for (const object of statements) {
        const attrs = readAttrs(object);
        const size = attrs.get('size');
        const { tokens, ...fields } = readObject(object, attrs);
        const record = {
          ...fields,
          ...(tokens ? { overrides: flattenStyle(tokens) } : {}),
          ...(isSize2(size) ? { size } : {}),
        };
        objects[keyFor(objects, record.id, object)] = record;
      }
      models.push({ id: head.id, dim: '2d', ...head.name, objects });
    } else {
      const objects: Record<string, Model.Object3D> = {};
      for (const object of statements) {
        const attrs = readAttrs(object);
        const scale = readScale(attrs.get('scale'));
        const { tokens, ...fields } = readObject(object, attrs);
        const record = {
          ...fields,
          ...(tokens ? { overrides: tokens satisfies Style3D } : {}),
          ...(scale ? { scale } : {}),
        };
        objects[keyFor(objects, record.id, object)] = record;
      }
      models.push({ id: head.id, dim: '3d', ...head.name, objects });
    }
  }

  const layouts: Model.LayoutRecord[] = [];
  for (const statement of statementsOf('LayoutDecl')) {
    const head = readHead('layout', statement);
    if (!head) {
      continue;
    }
    const declared = asString(head.attrs.get('model'));
    const model = models.find((candidate) => candidate.id === declared && candidate.dim === head.dim);
    const objects = new Set(model ? Object.keys(model.objects) : []);
    const statements = bodyOf(statement, 'LayoutBody', 'ElementStmt');
    const groups = new Map<string, GroupSpec>();
    // A group's composite object goes in the layout's model, or in one made for the layout when it names none.
    const composite = (id: string) => `${head.id}/${id}`;
    const modelId = (): string | undefined => (groups.size === 0 || model ? declared : `${head.id}${GROUPS_MODEL}`);
    const addComposites = () => {
      const id = modelId();
      if (groups.size === 0 || id === undefined) {
        return;
      }
      const created = [...groups.keys()].map((group) => ({
        id: composite(group),
        type: 'group',
        parts: composite(group),
      }));
      const index = models.findIndex((candidate) => candidate.id === id && candidate.dim === head.dim);
      const current = models[index];
      if (current?.dim === '2d') {
        models[index] = { ...current, objects: { ...current.objects, ...byId(created) } };
      } else if (current?.dim === '3d') {
        models[index] = { ...current, objects: { ...current.objects, ...byId(created) } };
      } else if (head.dim === '2d') {
        models.push({ id, dim: '2d', objects: byId(created) });
      } else {
        models.push({ id, dim: '3d', objects: byId(created) });
      }
    };
    const base = () => ({ id: head.id, ...head.name, ...optional('model', modelId()) });
    const compositeLayout = (id: string) => ({
      id: composite(id),
      ...optional('model', modelId()),
      kind: 'composite' as const,
      anonymous: true,
      ...optional('arrange', groups.get(id)?.arrange),
    });
    if (head.dim === '2d') {
      const elements: Record<string, Model.Element2D> = {};
      for (const element of statements) {
        const { record, group } = readElement2D(element, objects);
        ranges.set(`layout:${head.id}/${record.id}`, element);
        elements[keyFor(elements, record.id, element)] = record;
        group && groups.set(record.id, group);
      }
      const grouped = groupElements(elements, groups, composite, ({ type: _type, ...group }, object) => ({
        ...group,
        object,
        fit: 'none',
      }));
      addComposites();
      layouts.push({ ...base(), dim: '2d', elements: grouped.elements });
      for (const [id, parts] of grouped.parts) {
        layouts.push({ ...compositeLayout(id), dim: '2d', elements: parts });
      }
    } else {
      const elements: Record<string, Model.Element3D> = {};
      for (const element of statements) {
        const { record, group } = readElement3D(element, objects);
        ranges.set(`layout:${head.id}/${record.id}`, element);
        elements[keyFor(elements, record.id, element)] = record;
        group && groups.set(record.id, group);
      }
      const grouped = groupElements(elements, groups, composite, ({ type: _type, ...group }, object) => ({
        ...group,
        object,
        fit: 'none',
      }));
      addComposites();
      layouts.push({ ...base(), dim: '3d', elements: grouped.elements });
      for (const [id, parts] of grouped.parts) {
        layouts.push(applyArrangement({ ...compositeLayout(id), dim: '3d', elements: parts }));
      }
    }
  }

  const scenes: Model.SceneRecord[] = [];
  for (const statement of statementsOf('SceneDecl')) {
    const head = readHead('scene', statement);
    if (!head) {
      continue;
    }
    const camera = bodyOf(statement, 'SceneBody', 'CameraStmt')[0];
    const base = {
      id: head.id,
      ...head.name,
      ...optionalString('theme', head.attrs.get('theme')),
      layout: asString(head.attrs.get('layout')) ?? '',
    };
    scenes.push(
      head.dim === '2d'
        ? { ...base, dim: '2d', camera: readCamera2D(camera) }
        : { ...base, dim: '3d', camera: readCamera3D(camera) },
    );
  }

  const document: Model.SceneDocument = { scenes, layouts, models };
  for (const problem of [...validateDocument(document), ...layoutTree(document).problems]) {
    const at = `${problem.part}:${problem.id}`;
    const range = (problem.element ? ranges.get(`${at}/${problem.element}`) : undefined) ??
      ranges.get(at) ?? { from: 0, to: 0 };
    report(range, problem.message);
  }
  return { document, problems };
};

/** A duplicate id keeps its own record under a distinct key, so validation reports it instead of it vanishing. */
const keyFor = (elements: Record<string, unknown>, id: string, statement: SyntaxNode): string =>
  id in elements ? `${id}@${statement.from}` : id;

/** Attributes the element reader maps to fields; any other attribute goes into `props`. */
const ELEMENT_KEYS: ReadonlySet<string> = new Set([
  'size',
  'scale',
  'rotation',
  'order',
  'layer',
  'hidden',
  'locked',
  'pinned',
  'from',
  'to',
  'members',
  'arrange',
  ...STYLE_KEYS,
]);

/** Attributes the object reader maps to fields; any other attribute goes into `props`. */
const OBJECT_KEYS: ReadonlySet<string> = new Set(['size', 'scale', 'parts', ...STYLE_KEYS]);

const optionalString = <K extends string>(key: K, value: AttrValue | undefined) => optional(key, asString(value));
const optionalBoolean = <K extends string>(key: K, value: AttrValue | undefined) => optional(key, asBoolean(value));
const optionalBinding = <K extends string>(key: K, value: AttrValue | undefined) => optional(key, parseBinding(value));

//
// Printing.
//

/** Bare when it lexes as a `Word`, which admits keywords (`rect`, `arrow`); `true`/`false` are quoted to stay strings. */
const formatWord = (value: string): string =>
  BARE_ID.test(value) && value !== 'true' && value !== 'false' ? value : formatString(value);

const formatVec2 = ({ x, y }: Model.Vec2): string => `${formatNumber(x)},${formatNumber(y)}`;
const formatVec3 = ({ x, y, z }: Model.Vec3): string => `${formatNumber(x)},${formatNumber(y)},${formatNumber(z)}`;

/** A value in the form `readValue` reads back to the same value. */
const formatValue = (value: unknown): string | undefined => {
  if (typeof value === 'number') {
    return formatNumber(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return formatWord(value);
  }
  if (typeof value === 'object' && value !== null) {
    if ('width' in value && 'height' in value && typeof value.width === 'number' && typeof value.height === 'number') {
      return `${formatNumber(value.width)}x${formatNumber(value.height)}`;
    }
    if ('x' in value && 'y' in value && typeof value.x === 'number' && typeof value.y === 'number') {
      return 'z' in value && typeof value.z === 'number'
        ? formatVec3({ x: value.x, y: value.y, z: value.z })
        : formatVec2({ x: value.x, y: value.y });
    }
  }
  return undefined;
};

const attr = (name: string, value: unknown): string[] => {
  const text = formatValue(value);
  return text === undefined ? [] : [`${name}=${text}`];
};

const formatScale = (scale: Model.Vec3): string =>
  scale.x === scale.y && scale.y === scale.z
    ? formatNumber(scale.x)
    : `${formatNumber(scale.x)}x${formatNumber(scale.y)}x${formatNumber(scale.z)}`;

/** Style tokens, then props, the order every element and object ends with. */
const formatStyleAndProps = (tokens: StyleTokens, item: { props?: Record<string, unknown> }): string[] => [
  ...STYLE_KEYS.flatMap((key) => attr(key, tokens[key])),
  ...Object.entries(item.props ?? {}).flatMap(([key, value]) => attr(key, value)),
];

/** The attributes every element shares, in the canonical order after its geometry. */
const formatBase = (element: Model.Element, tokens: StyleTokens, context: LayoutContext): string[] => [
  ...attr('order', element.z),
  ...attr('layer', element.layer),
  ...attr('hidden', element.hidden),
  ...attr('locked', element.locked),
  ...attr('pinned', element.pinned),
  ...(element.source ? [`from=${formatBinding(element.source, context)}`] : []),
  ...(element.target ? [`to=${formatBinding(element.target, context)}`] : []),
  ...formatGroup(context.groups.get(element.id)),
  ...formatStyleAndProps(tokens, element),
];

/** A group's members, in its composite's order, and the arrangement its composite runs. */
const formatGroup = (parts: Model.LayoutRecord | undefined): string[] =>
  parts
    ? [
        `members=${formatString(Object.keys(parts.elements).join(' '))}`,
        ...attr('arrange', parts.arrange?.kind),
        ...Object.entries(parts.arrange?.params ?? {}).flatMap(([key, value]) => attr(`${ARRANGE_PARAM}${key}`, value)),
      ]
    : [];

/** An end on a group's port is written as the member it names, as the text binds it. */
const formatBinding = ({ node, port }: ElementEndpoint, context: LayoutContext): string =>
  formatWord(
    port === undefined ? (node ?? '') : node !== undefined && context.groups.has(node) ? port : `${node ?? ''}#${port}`,
  );

/** `element <id> <object or kind> ["label"]`; an element placing an object names it where a kind would go. */
const formatHead = (element: Model.Element): string[] => [
  'element',
  formatId(element.id),
  formatWord(element.object ?? element.type ?? ''),
  ...(element.label === undefined ? [] : [formatString(element.label)]),
];

const formatElement2D = (element: Model.Element2D, context: LayoutContext): string =>
  [
    ...formatHead(element),
    ...(element.center ? ['@', formatVec2(element.center)] : []),
    ...attr('size', element.size),
    ...attr('rotation', element.rotation),
    ...formatBase(element, tokensOf2D(element.overrides), context),
  ].join(' ');

const formatElement3D = (element: Model.Element3D, context: LayoutContext): string =>
  [
    ...formatHead(element),
    ...(element.center ? ['@', formatVec3(element.center)] : []),
    ...(element.scale ? [`scale=${formatScale(element.scale)}`] : []),
    ...attr('rotation', element.rotation),
    ...formatBase(element, tokensOf3D(element.overrides), context),
  ].join(' ');

/**
 * A layout's element lines: a group (an element placing a group composite) is written as its members, back in the
 * layout's units, followed by the `group` line naming them.
 */
const elementLines = <E extends Model.Element2D | Model.Element3D>(
  elements: Readonly<Record<string, E>>,
  partsOf: (element: E) => Readonly<Record<string, E>> | undefined,
  format: (element: E) => string,
  asGroup: (element: E) => E,
): string[] =>
  Object.values(elements).flatMap((element) => {
    const parts = partsOf(element);
    return parts
      ? [
          ...Object.values(parts).map((member) => format(offsetCenter(member, element.center, 1))),
          format(asGroup(element)),
        ]
      : [format(element)];
  });

const formatObject = (object: Model.Object2D | Model.Object3D, tokens: StyleTokens): string =>
  [
    'object',
    formatId(object.id),
    formatWord(object.type),
    ...('size' in object ? attr('size', object.size) : []),
    ...('scale' in object && object.scale ? [`scale=${formatScale(object.scale)}`] : []),
    ...attr('parts', object.parts),
    ...formatStyleAndProps(tokens, object),
  ].join(' ');

const formatCamera = (scene: Model.SceneRecord): string =>
  scene.dim === '2d'
    ? ['camera', ...attr('center', scene.camera.center), ...attr('zoom', scene.camera.zoom)].join(' ')
    : [
        'camera',
        ...attr('target', scene.camera.target),
        ...attr('yaw', scene.camera.yaw),
        ...attr('pitch', scene.camera.pitch),
        ...attr('distance', scene.camera.distance),
        ...attr('fov', scene.camera.fov),
        ...attr('projection', scene.camera.projection),
      ].join(' ');

/** `<word> <id> dim=… <attributes> {`, its lines indented, then `}` and a newline. */
const formatBlock = (head: string[], lines: string[]): string =>
  [`${head.join(' ')} {`, ...lines.map((line) => `  ${line}`), '}', ''].join('\n');

const name = (value: string | undefined): string[] => (value === undefined ? [] : [`name=${formatString(value)}`]);

const formatSceneRecord = (scene: Model.SceneRecord): string =>
  formatBlock(
    [
      'scene',
      formatId(scene.id),
      `dim=${scene.dim}`,
      `layout=${formatWord(scene.layout)}`,
      ...name(scene.name),
      ...attr('theme', scene.theme),
    ],
    [formatCamera(scene)],
  );

const formatLayoutRecord = (
  layout: Model.LayoutRecord,
  composites: ReadonlyMap<string, Model.LayoutRecord>,
): string => {
  const groups = new Map(
    Object.values(layout.elements).flatMap((element) => {
      const parts = element.object === undefined ? undefined : composites.get(element.object);
      return parts ? [[element.id, parts]] : [];
    }),
  );
  const context: LayoutContext = { groups };
  return formatBlock(
    [
      'layout',
      formatId(layout.id),
      `dim=${layout.dim}`,
      ...(layout.model === undefined || layout.model === `${layout.id}${GROUPS_MODEL}`
        ? []
        : [`model=${formatWord(layout.model)}`]),
      ...name(layout.name),
    ],
    layout.dim === '2d'
      ? elementLines(
          layout.elements,
          (element) => {
            const parts = groups.get(element.id);
            return parts?.dim === '2d' ? parts.elements : undefined;
          },
          (element) => formatElement2D(element, context),
          ({ object: _object, fit: _fit, ...group }) => ({ ...group, type: 'group' }),
        )
      : elementLines(
          layout.elements,
          (element) => {
            const parts = groups.get(element.id);
            return parts?.dim === '3d' ? parts.elements : undefined;
          },
          (element) => formatElement3D(element, context),
          ({ object: _object, fit: _fit, ...group }) => ({ ...group, type: 'group' }),
        ),
  );
};

const formatModelRecord = (model: Model.ModelRecord, composites: ReadonlyMap<string, Model.LayoutRecord>): string =>
  formatBlock(
    ['model', formatId(model.id), `dim=${model.dim}`, ...name(model.name)],
    model.dim === '2d'
      ? Object.values(model.objects)
          .filter((object) => !composites.has(object.id))
          .map((object) => formatObject(object, tokensOf2D(object.overrides)))
      : Object.values(model.objects)
          .filter((object) => !composites.has(object.id))
          .map((object) => formatObject(object, tokensOf3D(object.overrides))),
  );

/**
 * The group composites of a document by id: anonymous composite layouts that a `group` object of the same id places,
 * which the text writes as `group` elements rather than as layouts and objects of their own.
 */
const groupComposites = (doc: Model.SceneDocument): Map<string, Model.LayoutRecord> => {
  const groupObjects = new Set(
    doc.models.flatMap((model) =>
      Object.values(model.objects).flatMap((object) =>
        object.type === 'group' && object.parts === object.id ? [object.id] : [],
      ),
    ),
  );
  return new Map(
    doc.layouts.flatMap((layout) =>
      layout.anonymous && layout.kind === 'composite' && groupObjects.has(layout.id) ? [[layout.id, layout]] : [],
    ),
  );
};

/**
 * Canonical text for a document: its scenes, then its layouts, then its models, one block each separated by a blank
 * line, with every placed element's position written out so the text is the whole of the records.
 */
export const printScenes = (doc: Model.SceneDocument): string => {
  const composites = groupComposites(doc);
  // A model the reader made only to hold a layout's groups is left out with them.
  const made = (model: Model.ModelRecord) =>
    model.id.endsWith(GROUPS_MODEL) && Object.keys(model.objects).every((id) => composites.has(id));
  return [
    ...doc.scenes.map(formatSceneRecord),
    ...doc.layouts
      .filter((layout) => !composites.has(layout.id))
      .map((layout) => formatLayoutRecord(layout, composites)),
    ...doc.models.filter((model) => !made(model)).map((model) => formatModelRecord(model, composites)),
  ].join('\n');
};
