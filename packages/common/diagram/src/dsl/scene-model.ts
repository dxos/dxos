//
// Copyright 2026 DXOS.org
//

import type { SyntaxNode } from '@lezer/common';

import { Scene as Model, applyLayout, validateDocument } from '@dxos/scene';

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
const LAYOUT_PARAM = 'layout-';

const isVec2 = (value: AttrValue | undefined): value is Model.Vec2 =>
  typeof value === 'object' && 'x' in value && !('z' in value);
const isVec3 = (value: AttrValue | undefined): value is Model.Vec3 => typeof value === 'object' && 'z' in value;
const isSize2 = (value: AttrValue | undefined): value is Model.Size2 => typeof value === 'object' && 'width' in value;
const asNumber = (value: AttrValue | undefined): number | undefined => (typeof value === 'number' ? value : undefined);
const asString = (value: AttrValue | undefined): string | undefined =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;
const asBoolean = (value: AttrValue | undefined): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const parseBinding = (value: AttrValue | undefined): Model.Binding | undefined => {
  const text = asString(value);
  if (text === undefined) {
    return undefined;
  }
  const [element, anchor] = text.split('#');
  return anchor === undefined ? { element } : { element, anchor };
};

/**
 * Reads every `scene { … }` block into the record form of `@dxos/scene`, lays out group members that have no position
 * yet, and reports grammar errors and model problems. Statements outside scene blocks belong to `read`.
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

  const readStyle = (attrs: Map<string, AttrValue>, range: Range): Model.Style | undefined => {
    const style: { -readonly [K in keyof Model.Style]: Model.Style[K] } = {};
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
  const readBase = (statement: SyntaxNode, attrs: Map<string, AttrValue>) => {
    const id = readId(statement.getChild('Id')) ?? '';
    const kind = slice(statement.getChild('Word') ?? statement);
    const labelNode = statement.getChild('Label');
    const style = readStyle(attrs, statement);
    const layoutParams = Object.fromEntries(
      [...attrs]
        .filter(([key]) => key.startsWith(LAYOUT_PARAM))
        .map(([key, value]) => [key.slice(LAYOUT_PARAM.length), value]),
    );
    const layoutKind = asString(attrs.get('layout'));
    const members = asString(attrs.get('members'))?.split(/\s+/).filter(Boolean);
    const props = Object.fromEntries(
      [...attrs].filter(([key]) => !ELEMENT_KEYS.has(key) && !key.startsWith(LAYOUT_PARAM)),
    );
    return {
      id,
      kind,
      ...(labelNode ? { label: unquote(slice(labelNode)) } : {}),
      ...optionalString('order', attrs.get('order')),
      ...optionalString('layer', attrs.get('layer')),
      ...optionalBoolean('hidden', attrs.get('hidden')),
      ...optionalBoolean('locked', attrs.get('locked')),
      ...optionalBoolean('pinned', attrs.get('pinned')),
      ...(style ? { style } : {}),
      ...optionalBinding('from', attrs.get('from')),
      ...optionalBinding('to', attrs.get('to')),
      ...(members ? { members } : {}),
      ...(layoutKind
        ? {
            layout:
              Object.keys(layoutParams).length > 0 ? { kind: layoutKind, params: layoutParams } : { kind: layoutKind },
          }
        : {}),
      ...optionalString('scene', attrs.get('scene')),
      ...(Object.keys(props).length > 0 ? { props } : {}),
    };
  };

  const readElement2D = (statement: SyntaxNode): Model.Element2D => {
    const attrs = readAttrs(statement);
    const position = statement.getChild('Position');
    const at = position && readPosition(position);
    const size = attrs.get('size');
    const rotation = asNumber(attrs.get('rotation'));
    if (at && isVec3(at)) {
      report(position, 'A 2D element takes an x,y position.');
    }
    return {
      ...readBase(statement, attrs),
      ...(at && isVec2(at) ? { center: at } : {}),
      ...(isSize2(size) ? { size } : {}),
      ...(rotation !== undefined ? { rotation } : {}),
    };
  };

  const readElement3D = (statement: SyntaxNode): Model.Element3D => {
    const attrs = readAttrs(statement);
    const position = statement.getChild('Position');
    const at = position && readPosition(position);
    const scaleValue = attrs.get('scale');
    const scale = isVec3(scaleValue)
      ? scaleValue
      : typeof scaleValue === 'number'
        ? { x: scaleValue, y: scaleValue, z: scaleValue }
        : undefined;
    const rotation = attrs.get('rotation');
    if (at && !isVec3(at)) {
      report(position, 'A 3D element takes an x,y,z position.');
    }
    return {
      ...readBase(statement, attrs),
      ...(at && isVec3(at) ? { position: at } : {}),
      ...(scale ? { scale } : {}),
      ...(isVec3(rotation) ? { rotation } : {}),
    };
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

  const scenes: Model.SceneRecord[] = [];
  for (const statement of childrenOf(tree.topNode).filter((child) => child.name === 'SceneDecl')) {
    const id = readId(statement.getChild('Id')) ?? '';
    const attrs = readAttrs(statement);
    const body = statement.getChild('SceneBody');
    const statements = body ? childrenOf(body) : [];
    const camera = statements.find((child) => child.name === 'CameraStmt');
    const elementStatements = statements.filter((child) => child.name === 'ElementStmt');
    const dim = attrs.get('dim');
    if (dim !== '2d' && dim !== '3d') {
      report(statement, `scene "${id}" needs dim=2d or dim=3d.`);
      continue;
    }
    ranges.set(id, statement);
    const base = {
      id,
      ...optionalString('name', attrs.get('name')),
      ...optionalString('theme', attrs.get('theme')),
      ...optionalBoolean('component', attrs.get('component')),
    };
    if (dim === '2d') {
      const elements: Record<string, Model.Element2D> = {};
      for (const element of elementStatements) {
        const record = readElement2D(element);
        ranges.set(`${id}/${record.id}`, element);
        elements[keyFor(elements, record.id, element)] = record;
      }
      scenes.push({ ...base, dim, camera: readCamera2D(camera), elements });
    } else {
      const elements: Record<string, Model.Element3D> = {};
      for (const element of elementStatements) {
        const record = readElement3D(element);
        ranges.set(`${id}/${record.id}`, element);
        elements[keyFor(elements, record.id, element)] = record;
      }
      scenes.push(applyLayout({ ...base, dim, camera: readCamera3D(camera), elements }));
    }
  }

  const document: Model.SceneDocument = { scenes };
  for (const problem of validateDocument(document)) {
    const range = ranges.get(problem.element ? `${problem.scene}/${problem.element}` : problem.scene) ??
      ranges.get(problem.scene) ?? { from: 0, to: 0 };
    report(range, problem.message);
  }
  return { document, problems };
};

/** A duplicate id keeps its own record under a distinct key, so validation reports it instead of it vanishing. */
const keyFor = (elements: Record<string, unknown>, id: string, statement: SyntaxNode): string =>
  id in elements ? `${id}@${statement.from}` : id;

/** Attributes the element reader maps to fields; any other attribute goes into `props`. */
const ELEMENT_KEYS = new Set([
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
  'layout',
  'scene',
  ...STYLE_KEYS,
]);

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

/** The attributes every element shares, in the canonical order after its geometry. */
const formatBase = (element: Model.Element): string[] => [
  ...attr('order', element.order),
  ...attr('layer', element.layer),
  ...attr('hidden', element.hidden),
  ...attr('locked', element.locked),
  ...attr('pinned', element.pinned),
  ...(element.from ? [`from=${formatBinding(element.from)}`] : []),
  ...(element.to ? [`to=${formatBinding(element.to)}`] : []),
  ...(element.members ? [`members=${formatString(element.members.join(' '))}`] : []),
  ...attr('layout', element.layout?.kind),
  ...Object.entries(element.layout?.params ?? {}).flatMap(([key, value]) => attr(`${LAYOUT_PARAM}${key}`, value)),
  ...attr('scene', element.scene),
  ...STYLE_KEYS.flatMap((key) => attr(key, element.style?.[key])),
  ...Object.entries(element.props ?? {}).flatMap(([key, value]) => attr(key, value)),
];

const formatBinding = ({ element, anchor }: Model.Binding): string =>
  formatWord(anchor === undefined ? element : `${element}#${anchor}`);

const formatHead = (element: Model.Element): string[] => [
  'element',
  formatId(element.id),
  formatWord(element.kind),
  ...(element.label === undefined ? [] : [formatString(element.label)]),
];

const formatElement2D = (element: Model.Element2D): string =>
  [
    ...formatHead(element),
    ...(element.center ? ['@', formatVec2(element.center)] : []),
    ...attr('size', element.size),
    ...attr('rotation', element.rotation),
    ...formatBase(element),
  ].join(' ');

const formatElement3D = (element: Model.Element3D): string =>
  [
    ...formatHead(element),
    ...(element.position ? ['@', formatVec3(element.position)] : []),
    ...(element.scale ? [`scale=${formatScale(element.scale)}`] : []),
    ...attr('rotation', element.rotation),
    ...formatBase(element),
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

const formatSceneRecord = (scene: Model.SceneRecord): string => {
  const head = [
    'scene',
    formatId(scene.id),
    `dim=${scene.dim}`,
    ...(scene.name === undefined ? [] : [`name=${formatString(scene.name)}`]),
    ...attr('theme', scene.theme),
    ...attr('component', scene.component),
  ].join(' ');
  const elements =
    scene.dim === '2d'
      ? Object.values(scene.elements).map(formatElement2D)
      : Object.values(scene.elements).map(formatElement3D);
  return [`${head} {`, `  ${formatCamera(scene)}`, ...elements.map((line) => `  ${line}`), '}', ''].join('\n');
};

/**
 * Canonical text for a document: one block per scene separated by a blank line, the camera first, then one line per
 * element in record order, with every placed element's position written out so the text is the whole of the records.
 */
export const printScenes = (doc: Model.SceneDocument): string => doc.scenes.map(formatSceneRecord).join('\n');
