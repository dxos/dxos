//
// Copyright 2026 DXOS.org
//

// Every schema a stored drawing is made of, in one ordered registry, and the JSON Schema document and docs page
// printed from it, so the format has one description that cannot drift from the code.

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as Struct from 'effect/Struct';

import { Ref, Type } from '@dxos/echo';

import * as Element from './element.ts';
import * as Scene from './Scene.ts';
import * as Shape from './shape.ts';
import * as Style from './style.ts';

//
// Registry.
//

/** The page's sections, in the order it prints them. */
export const GROUPS = [
  { name: 'Document', summary: 'The root of a drawing as it is read or printed whole.' },
  { name: 'Scenes', summary: 'A scene views one layout through a camera.' },
  { name: 'Layouts', summary: 'A layout positions elements in one coordinate space.' },
  { name: 'Models', summary: 'A model holds the reusable objects that elements place, and the named styles.' },
  { name: 'Elements', summary: 'An element is one stored record of a layout, in either dimension.' },
  { name: 'Nodes', summary: 'A node is the typed form of a 2D element that is not a link, one schema per kind.' },
  { name: 'Links', summary: 'A link is the typed form of a 2D element that joins two ends.' },
  { name: 'Styles', summary: 'A style is the look an element takes, by name or as its own overrides.' },
  {
    name: 'Diagram shapes',
    summary: 'A diagram shape is a primitive of the diagram DSL, stored inside a `diagram` node.',
  },
] as const;

export type Group = (typeof GROUPS)[number]['name'];

/** The module an entry's schema, or the fields it is built from, comes from. */
export type Module = 'Scene' | 'element' | 'style' | 'shape';

/** One registered type. */
export type Entry = {
  /** The name the type is imported by (`Scene.Element2D`, `Shape.Box`, `RectNode`); unique in the registry. */
  readonly name: string;
  readonly module: Module;
  readonly group: Group;
  /** One sentence on what the type is. */
  readonly summary: string;
  readonly schema: Schema.Top;
  /** The entry whose fields this one repeats, so it lists only the fields that differ. */
  readonly base?: string;
  /** Set on an ECHO object type: its typename DXN. */
  readonly echo?: { readonly uri: string; readonly typename: string; readonly version: string };
  /** Built here from a module's fields rather than exported by it. */
  readonly derived?: boolean;
};

type EntryOptions = { readonly base?: string };

const define =
  (module: Module, prefix: string) =>
  (group: Group, name: string, schema: Schema.Top, summary: string, { base }: EntryOptions = {}): Entry => ({
    name: `${prefix}${name}`,
    module,
    group,
    summary,
    schema,
    ...(base ? { base } : {}),
  });

const scene = define('Scene', 'Scene.');
const element = define('element', '');
const style = define('style', '');
const shape = define('shape', 'Shape.');

/** A schema this registry builds from `module`'s fields, where the module exports none for them. */
const derived = (module: Module, ...args: Parameters<ReturnType<typeof define>>): Entry => ({
  ...define(module, '')(...args),
  derived: true,
});

/** An ECHO object type, described by the Effect Schema it was made from. */
const echo = (
  module: Module,
  group: Group,
  name: string,
  type: Type.AnyObj,
  summary: string,
  options: EntryOptions = {},
): Entry => ({
  ...define(module, '')(group, name, Type.getSchema(type), summary, options),
  echo: { uri: Type.getURI(type), typename: Type.getTypename(type), version: Type.getVersion(type) },
});

/** `Scene.SceneDocument` as a schema: the type has none of its own, and the JSON Schema document needs a root. */
export const Document = Schema.Struct({
  scenes: Schema.Array(Schema.Union([Scene.SceneRecord2D, Scene.SceneRecord3D])),
  layouts: Schema.Array(Schema.Union([Scene.LayoutRecord2D, Scene.LayoutRecord3D])),
  models: Schema.Array(Schema.Union([Scene.ModelRecord2D, Scene.ModelRecord3D])),
});

/** The fields every link kind shares; `linkBase` is exported as fields, not as a schema. */
export const LinkBase = Schema.Struct({ type: Schema.String, ...Element.linkBase });

/** The id and style fields every diagram shape shares, which `shape.ts` keeps private. */
export const ShapeBase = Schema.Struct(Struct.omit(Shape.Curve.fields, ['kind', 'points']));

/** One entry of a `StyleCatalog`, which the catalog declares inline. */
export const CatalogStyle = Schema.Struct({ ...Style.Style3D.fields, ...Style.Style2D.fields });

/** Every type of a stored drawing, in the order the page prints them. */
export const ENTRIES: readonly Entry[] = [
  derived(
    'Scene',
    'Document',
    'Document',
    Document,
    'Scenes, layouts and models together. The first scene is the root.',
  ),

  scene('Scenes', 'SceneRecord2D', Scene.SceneRecord2D, 'A 2D scene as plain data.'),
  scene('Scenes', 'SceneRecord3D', Scene.SceneRecord3D, 'A 3D scene as plain data.', {
    base: 'Scene.SceneRecord2D',
  }),
  echo('Scene', 'Scenes', 'Scene.Scene2D', Scene.Scene2D, 'A 2D scene as an ECHO object.', {
    base: 'Scene.SceneRecord2D',
  }),
  echo('Scene', 'Scenes', 'Scene.Scene3D', Scene.Scene3D, 'A 3D scene as an ECHO object.', {
    base: 'Scene.SceneRecord3D',
  }),
  scene('Scenes', 'Camera2D', Scene.Camera2D, 'Where a 2D scene looks and how far in.'),
  scene('Scenes', 'Camera3D', Scene.Camera3D, 'An orbit camera. Angles are in degrees.'),

  scene('Layouts', 'LayoutRecord2D', Scene.LayoutRecord2D, 'A 2D layout as plain data.'),
  scene('Layouts', 'LayoutRecord3D', Scene.LayoutRecord3D, 'A 3D layout as plain data.', {
    base: 'Scene.LayoutRecord2D',
  }),
  echo('Scene', 'Layouts', 'Scene.Layout2D', Scene.Layout2D, 'A 2D layout as an ECHO object.', {
    base: 'Scene.LayoutRecord2D',
  }),
  echo('Scene', 'Layouts', 'Scene.Layout3D', Scene.Layout3D, 'A 3D layout as an ECHO object.', {
    base: 'Scene.LayoutRecord3D',
  }),
  scene('Layouts', 'LayoutKind', Scene.LayoutKind, 'A plain view, or the definition of a composite object.'),
  scene('Layouts', 'GridPitch', Scene.GridPitch, 'A grid pitch in scene px.'),
  scene(
    'Layouts',
    'Lattice',
    Scene.Lattice,
    "Lattice mode's grid: shapes span whole cells and links run in the gutters.",
  ),
  scene('Layouts', 'Constraint', Scene.Constraint, "Constrained mode's relation of one element to another."),
  scene('Layouts', 'Arrangement', Scene.Arrangement, 'How a layout places the elements that have no position yet.'),
  element('Layouts', 'Layer', Element.Layer, 'A layer that elements paint on, bottom first.'),

  scene('Models', 'ModelRecord2D', Scene.ModelRecord2D, 'A 2D model as plain data.'),
  scene('Models', 'ModelRecord3D', Scene.ModelRecord3D, 'A 3D model as plain data.', {
    base: 'Scene.ModelRecord2D',
  }),
  echo('Scene', 'Models', 'Scene.Model2D', Scene.Model2D, 'A 2D model as an ECHO object.', {
    base: 'Scene.ModelRecord2D',
  }),
  echo('Scene', 'Models', 'Scene.Model3D', Scene.Model3D, 'A 3D model as an ECHO object.', {
    base: 'Scene.ModelRecord3D',
  }),
  scene('Models', 'Object2D', Scene.Object2D, 'A reusable 2D object, with no position.'),
  scene('Models', 'Object3D', Scene.Object3D, 'A reusable 3D object, with no position.'),
  scene('Models', 'StoredObject2D', Scene.StoredObject2D, 'A 2D object as a `Model2D` stores it.', {
    base: 'Scene.Object2D',
  }),
  scene('Models', 'StoredObject3D', Scene.StoredObject3D, 'A 3D object as a `Model3D` stores it.', {
    base: 'Scene.Object3D',
  }),

  scene('Elements', 'BaseElement', Scene.BaseElement, 'The fields every element has, in either dimension.'),
  scene('Elements', 'Element2D', Scene.Element2D, 'A 2D element.', { base: 'Scene.BaseElement' }),
  scene('Elements', 'Element3D', Scene.Element3D, 'A 3D element.', { base: 'Scene.BaseElement' }),
  element('Elements', 'ElementEndpoint', Element.ElementEndpoint, "A link's end as an element stores it."),
  scene('Elements', 'DslIdentity', Scene.DslIdentity, 'The DSL statement that made an element.'),
  element('Elements', 'PartLayout', Element.PartLayout, 'How a part of a composite follows its frame on each axis.'),
  element('Elements', 'PartConstraint', Element.PartConstraint, 'How a part follows its frame on one axis.'),
  scene('Elements', 'InstanceFit', Scene.InstanceFit, 'How a placed composite maps its parts into its frame.'),
  scene('Elements', 'Dimension', Scene.Dimension, 'The dimension of a scene, layout or model.'),
  scene('Elements', 'Vec2', Scene.Vec2, 'A 2D vector.'),
  scene('Elements', 'Vec3', Scene.Vec3, 'A 3D vector.'),
  scene('Elements', 'Size2', Scene.Size2, 'A 2D size.'),

  element('Nodes', 'NodeBase', Element.NodeBase, 'The fields every node kind shares.'),
  element('Nodes', 'BaseNode', Element.BaseNode, 'A node whose kind is not known here: a box with a label.', {
    base: 'NodeBase',
  }),
  element('Nodes', 'RectNode', Element.RectNode, 'A rectangle.', { base: 'NodeBase' }),
  element('Nodes', 'EllipseNode', Element.EllipseNode, 'An ellipse inscribed in the frame.', { base: 'NodeBase' }),
  element('Nodes', 'CloudNode', Element.CloudNode, 'A cloud filling the frame.', { base: 'NodeBase' }),
  element('Nodes', 'CloudParams', Element.CloudParams, "A cloud's own settings."),
  element('Nodes', 'PolygonNode', Element.PolygonNode, 'A regular polygon.', { base: 'NodeBase' }),
  element('Nodes', 'PolygonParams', Element.PolygonParams, "A polygon's own settings."),
  element('Nodes', 'ShapeNode', Element.ShapeNode, 'A shape that a named recipe draws from the frame and parameters.', {
    base: 'NodeBase',
  }),
  element('Nodes', 'PolylineNode', Element.PolylineNode, 'A line through points, in the 0 to 1 space of its frame.', {
    base: 'NodeBase',
  }),
  element('Nodes', 'PolylineParams', Element.PolylineParams, "A polyline's own settings."),
  element('Nodes', 'PolylineBend', Element.PolylineBend, 'A segment of a polyline that runs as a curve.'),
  element('Nodes', 'HullNode', Element.HullNode, 'A border drawn round the nodes that name it as their parent.', {
    base: 'NodeBase',
  }),
  element('Nodes', 'NoteNode', Element.NoteNode, 'Free text.', { base: 'NodeBase' }),
  element('Nodes', 'ViewNode', Element.ViewNode, 'A window onto a child view.', { base: 'NodeBase' }),
  element('Nodes', 'ViewLink', Element.ViewLink, 'How a view node shows what it links to.'),
  element('Nodes', 'InstanceNode', Element.InstanceNode, 'A composite object placed in a scene.', {
    base: 'NodeBase',
  }),
  element('Nodes', 'PathNode', Element.PathNode, 'A vector shape from SVG path data.', { base: 'NodeBase' }),
  element('Nodes', 'GeneratorNode', Element.GeneratorNode, 'A node whose content a generator computes.', {
    base: 'NodeBase',
  }),
  element('Nodes', 'DiagramNode', Element.DiagramNode, 'A shape of a laid-out diagram.', { base: 'NodeBase' }),
  element('Nodes', 'DiagramHeading', Element.DiagramHeading, "Where a diagram shape's heading sits."),
  element('Nodes', 'DiagramShape', Element.DiagramShape, 'The diagram shapes a diagram node can hold.'),
  element('Nodes', 'BuiltinNode', Element.BuiltinNode, 'Any node kind this package defines.'),
  element('Nodes', 'Port', Element.Port, "An attachment point on a node's frame."),
  element('Nodes', 'Side', Element.Side, "A side of a node's frame."),
  element('Nodes', 'PortDirection', Element.PortDirection, 'What a port takes.'),
  element('Nodes', 'Padding', Element.Padding, "Space between a shape's frame and its text."),
  element('Nodes', 'Point', Element.Point, 'A point.'),
  element('Nodes', 'Size', Element.Size, 'A size.'),
  element('Nodes', 'Bounds', Element.Bounds, 'A rectangle by its top-left corner and size.'),

  derived('element', 'Links', 'LinkBase', LinkBase, 'The fields every link kind shares.'),
  element('Links', 'LineLink', Element.LineLink, 'A straight link.', { base: 'LinkBase' }),
  element('Links', 'OrthoLink', Element.OrthoLink, 'A link of horizontal and vertical segments.', {
    base: 'LinkBase',
  }),
  element('Links', 'CurveLink', Element.CurveLink, 'A cubic curve that leaves each port along its normal.', {
    base: 'LinkBase',
  }),
  element('Links', 'SplineLink', Element.SplineLink, 'A smooth curve through control points.', { base: 'LinkBase' }),
  element('Links', 'SmartLink', Element.SmartLink, 'A link that is routed between its ends.', { base: 'LinkBase' }),
  element('Links', 'Link', Element.Link, 'Any link kind.'),
  element('Links', 'Endpoint', Element.Endpoint, "A link's end: on a node, or free at a point."),
  element('Links', 'PortEndpoint', Element.PortEndpoint, 'A link end on a node.'),
  element('Links', 'PointEndpoint', Element.PointEndpoint, 'A free link end at a point.'),
  element('Links', 'LinkEnds', Element.LinkEnds, 'The markers at the two ends of a link.'),
  element('Links', 'Marker', Element.Marker, 'What is drawn at a link end.'),
  element('Links', 'DiagramConnector', Element.DiagramConnector, 'A link drawn as a diagram connector.'),
  element('Links', 'DiagramCaption', Element.DiagramCaption, "Where a diagram connector's caption sits."),

  element('Styles', 'LineStyle', Element.LineStyle, "A link's style."),
  element('Styles', 'NodeStyle', Element.NodeStyle, "A node's style.", { base: 'LineStyle' }),
  style('Styles', 'Style2D', Style.Style2D, 'A 2D look: the node style and the diagram vocabulary.', {
    base: 'NodeStyle',
  }),
  style('Styles', 'Style3D', Style.Style3D, 'A 3D look: a material over a hue and a tone.'),
  style('Styles', 'NamedStyle2D', Style.NamedStyle2D, "A model's named 2D style.", { base: 'Style2D' }),
  style('Styles', 'NamedStyle3D', Style.NamedStyle3D, "A model's named 3D style.", { base: 'Style3D' }),
  element('Styles', 'StyleClass', Element.StyleClass, 'A named look that nodes and links take their style from.'),
  echo('style', 'Styles', 'StyleCatalog', Style.StyleCatalog, 'A reusable set of styles, as an ECHO object.'),
  derived(
    'style',
    'Styles',
    'CatalogStyle',
    CatalogStyle,
    'One style of a catalog: the 2D and 3D fields in one struct.',
  ),
  element('Styles', 'StyleHue', Element.StyleHue, 'The hues the style pickers offer.'),
  element('Styles', 'NodeTone', Element.NodeTone, 'How strongly a hue fills a frame.'),
  element('Styles', 'TextTone', Element.TextTone, "How light or dark a text's hue is drawn."),

  derived('shape', 'Diagram shapes', 'ShapeBase', ShapeBase, 'The id and style fields every diagram shape shares.'),
  shape('Diagram shapes', 'Box', Shape.Box, 'A closed shape in a bounding box.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Circle', Shape.Circle, 'A circle.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Polyline', Shape.Polyline, 'A straight segment or a polyline.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Curve', Shape.Curve, 'A smooth curve through points.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Arc', Shape.Arc, 'A circular arc. Angles are in degrees.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Text', Shape.Text, 'Free-standing text.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Arrow', Shape.Arrow, 'A connector between two elements or points.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Portal', Shape.Portal, 'A window onto another drawing.', { base: 'ShapeBase' }),
  shape('Diagram shapes', 'Element', Shape.Element, 'Any diagram shape.'),
  shape('Diagram shapes', 'Point', Shape.Point, 'A point.'),
  shape('Diagram shapes', 'BoxKind', Shape.BoxKind, 'The closed shapes a box can be.'),
  shape('Diagram shapes', 'Corners', Shape.Corners, 'Which corners of a rectangle are rounded.'),
  shape('Diagram shapes', 'Color', Shape.Color, 'The colors of a diagram shape.'),
  shape('Diagram shapes', 'Fill', Shape.Fill, 'The interior of a closed shape.'),
  shape('Diagram shapes', 'Stroke', Shape.Stroke, 'How a stroke is drawn.'),
  shape('Diagram shapes', 'Weight', Shape.Weight, 'Stroke weight and text size together.'),
  shape('Diagram shapes', 'Align', Shape.Align, "Where a shape's text sits across it."),
  shape('Diagram shapes', 'VerticalAlign', Shape.VerticalAlign, "Where a shape's text sits down it."),
  shape('Diagram shapes', 'Layout', Shape.Layout, 'How a grid box places its children.'),
  shape('Diagram shapes', 'Place', Shape.Place, 'Where grid tracks sit when they leave space over.'),
  shape('Diagram shapes', 'Path', Shape.Path, 'How a connector runs between its ends.'),
  shape('Diagram shapes', 'ArrowHead', Shape.ArrowHead, "The marker at a connector's target."),
  shape('Diagram shapes', 'ArrowTail', Shape.ArrowTail, "The marker at a connector's source."),
  shape('Diagram shapes', 'Relation', Shape.Relation, 'What a connector means.'),
];

/** An element kind with no schema in this package: the package named defines or draws it. */
export type ExternalKind = { readonly kind: string; readonly dimension: string; readonly package: string };

/** The kinds a layout may hold that this package has no schema for; an element of one carries the base fields. */
export const EXTERNAL_KINDS: readonly ExternalKind[] = [
  { kind: 'link', dimension: '2D and 3D', package: '@dxos/react-ui-canvas' },
  { kind: 'label', dimension: '2D and 3D', package: '@dxos/react-ui-canvas' },
  { kind: 'group', dimension: '2D and 3D', package: '@dxos/react-ui-canvas' },
  { kind: 'card', dimension: '2D', package: '@dxos/react-ui-canvas' },
  { kind: 'icon', dimension: '2D', package: '@dxos/react-ui-canvas' },
  { kind: 'solid', dimension: '2D and 3D', package: '@dxos/react-ui-canvas' },
  { kind: 'image', dimension: '2D', package: '@dxos/plugin-canvas' },
  { kind: 'graph', dimension: '2D', package: '@dxos/plugin-canvas' },
  { kind: 'cube', dimension: '3D', package: '@dxos/react-ui-canvas' },
  { kind: 'sphere', dimension: '3D', package: '@dxos/react-ui-canvas' },
  { kind: 'cylinder', dimension: '3D', package: '@dxos/react-ui-canvas' },
  { kind: 'cone', dimension: '3D', package: '@dxos/react-ui-canvas' },
  { kind: 'pyramid', dimension: '3D', package: '@dxos/react-ui-canvas' },
  { kind: 'mesh', dimension: '3D', package: '@dxos/react-ui-canvas' },
];

//
// Description: a schema as plain data that both printers read.
//

export type Literal = string | number | boolean;

/** The shape of a type, with every registered type it holds named rather than repeated. */
export type TypeDesc =
  | { readonly kind: 'ref'; readonly name: string; readonly open?: boolean }
  | { readonly kind: 'echo-ref'; readonly target: string }
  | { readonly kind: 'string' | 'boolean' | 'any' | 'unknown' }
  | { readonly kind: 'number'; readonly integer?: boolean; readonly minimum?: number; readonly maximum?: number }
  | { readonly kind: 'literals'; readonly values: readonly Literal[] }
  | { readonly kind: 'array'; readonly items: TypeDesc }
  | { readonly kind: 'record'; readonly values: TypeDesc }
  | { readonly kind: 'union'; readonly members: readonly TypeDesc[] }
  | { readonly kind: 'object'; readonly fields: readonly FieldDesc[]; readonly rest?: TypeDesc };

export type FieldDesc = {
  readonly name: string;
  readonly optional: boolean;
  readonly type: TypeDesc;
  readonly description?: string;
};

/** An entry with its shape. */
export type Described = { readonly entry: Entry; readonly type: TypeDesc };

type Resolve = (ast: SchemaAST.AST) => TypeDesc | undefined;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unsupported = (what: string): never => {
  throw new Error(`The ontology cannot describe ${what}; extend \`describeAst\` in ontology.ts.`);
};

const literalOf = ({ literal }: SchemaAST.Literal): Literal =>
  typeof literal === 'bigint' ? unsupported('a bigint literal') : literal;

type NumberDesc = Extract<TypeDesc, { kind: 'number' }>;

/** A number check as the bounds it sets; one this does not know is an error, so no constraint is dropped. */
const constraintOf = (check: SchemaAST.Check<never>): Partial<NumberDesc> => {
  const representation: unknown = check.annotations?.representation;
  const id = isRecord(representation) ? representation.id : undefined;
  const payload = isRecord(representation) && isRecord(representation.payload) ? representation.payload : {};
  const bound = (key: string) => (typeof payload[key] === 'number' ? { [key]: payload[key] } : {});
  switch (id) {
    case 'effect/schema/isFinite':
      return {};
    case 'effect/schema/isInt':
      return { integer: true };
    case 'effect/schema/isBetween':
    case 'effect/schema/isGreaterThanOrEqualTo':
    case 'effect/schema/isLessThanOrEqualTo':
      return { ...bound('minimum'), ...bound('maximum') };
    default:
      return unsupported(`the number check \`${String(id)}\``);
  }
};

const describeField = (signature: SchemaAST.PropertySignature, resolve: Resolve): FieldDesc => {
  const description = SchemaAST.resolveDescription(signature.type);
  return {
    name: String(signature.name),
    optional: signature.type.context?.isOptional === true,
    type: describeNested(signature.type, resolve),
    ...(description ? { description } : {}),
  };
};

const describeNested = (ast: SchemaAST.AST, resolve: Resolve): TypeDesc => resolve(ast) ?? describeAst(ast, resolve);

/** The shape of `ast` itself; `resolve` names the registered types found inside it. */
const describeAst = (ast: SchemaAST.AST, resolve: Resolve): TypeDesc => {
  if (SchemaAST.isUnion(ast)) {
    const members = ast.types.filter((member) => !SchemaAST.isUndefined(member));
    if (members.length > 0 && members.every(SchemaAST.isLiteral)) {
      return { kind: 'literals', values: members.map(literalOf) };
    }
    return members.length === 1
      ? describeNested(members[0], resolve)
      : { kind: 'union', members: members.map((member) => describeNested(member, resolve)) };
  }
  if (SchemaAST.isObjects(ast)) {
    const fields = ast.propertySignatures.map((signature) => describeField(signature, resolve));
    if (ast.indexSignatures.length > 1 || ast.indexSignatures.some(({ parameter }) => !SchemaAST.isString(parameter))) {
      return unsupported('an index signature that is not one string-keyed record');
    }
    const [index] = ast.indexSignatures;
    const rest = index ? describeNested(index.type, resolve) : undefined;
    return fields.length === 0 && rest
      ? { kind: 'record', values: rest }
      : { kind: 'object', fields, ...(rest ? { rest } : {}) };
  }
  if (SchemaAST.isArrays(ast)) {
    return ast.elements.length === 0 && ast.rest.length === 1
      ? { kind: 'array', items: describeNested(ast.rest[0], resolve) }
      : unsupported('a tuple');
  }
  if (SchemaAST.isLiteral(ast)) {
    return { kind: 'literals', values: [literalOf(ast)] };
  }
  if (SchemaAST.isNumber(ast)) {
    return (ast.checks ?? []).reduce<NumberDesc>((desc, check) => ({ ...desc, ...constraintOf(check) }), {
      kind: 'number',
    });
  }
  if (SchemaAST.isDeclaration(ast)) {
    const target = Ref.getReferenceTarget(ast);
    return target ? { kind: 'echo-ref', target } : unsupported('a declaration that is not an ECHO reference');
  }
  if (ast.checks) {
    return unsupported(`a check on \`${ast._tag}\``);
  }
  return SchemaAST.isString(ast)
    ? { kind: 'string' }
    : SchemaAST.isBoolean(ast)
      ? { kind: 'boolean' }
      : SchemaAST.isAny(ast)
        ? { kind: 'any' }
        : SchemaAST.isUnknown(ast)
          ? { kind: 'unknown' }
          : unsupported(`the schema node \`${ast._tag}\``);
};

/** A shape as a comparison key; descriptions are left out so an annotated copy of a type still matches it. */
const keyOf = (desc: TypeDesc): string =>
  JSON.stringify(desc, (key, value: unknown) => (key === 'description' ? undefined : value));

/** The shapes a registered type is looked up by: a primitive or a list would match types that only look alike. */
const isNameable = (desc: TypeDesc): boolean =>
  (desc.kind === 'object' && desc.fields.length > 0) ||
  (desc.kind === 'literals' && desc.values.length > 1) ||
  desc.kind === 'union';

/** The type an optional field holds: `Schema.optional` wraps it in a union with `undefined`. */
const unwrap = (ast: SchemaAST.AST): SchemaAST.AST => {
  const members = SchemaAST.isUnion(ast) ? ast.types.filter((member) => !SchemaAST.isUndefined(member)) : [];
  return members.length === 1 ? members[0] : ast;
};

/**
 * Every entry with its shape. A registered type inside another is named: by its schema's identity, or, since
 * annotating a schema copies it, by an equal shape among the entries of the same module.
 */
export const describe = (entries: readonly Entry[] = ENTRIES): readonly Described[] => {
  const raw = (ast: SchemaAST.AST): TypeDesc => describeAst(ast, () => undefined);
  const byAst = new Map(entries.map((entry) => [entry.schema.ast, entry]));
  const byKey = Map.groupBy(entries, (entry) => keyOf(raw(entry.schema.ast)));
  // A field shared by entries of two modules reads the same in both: it is named for the first that holds it.
  const named = new Map<SchemaAST.AST, TypeDesc | undefined>();

  const nameFor = (owner: Entry, ast: SchemaAST.AST): TypeDesc | undefined => {
    const exact = byAst.get(ast);
    if (exact) {
      return { kind: 'ref', name: exact.name };
    }
    const desc = raw(ast);
    const match = (shape: TypeDesc) =>
      byKey.get(keyOf(shape))?.find((entry) => entry !== owner && entry.module === owner.module);
    const same = isNameable(desc) ? match(desc) : undefined;
    if (same) {
      return { kind: 'ref', name: same.name };
    }
    // A struct with a rest signature is a registered struct that also keeps a kind's own fields.
    const closed = desc.kind === 'object' && desc.rest ? match({ kind: 'object', fields: desc.fields }) : undefined;
    return closed ? { kind: 'ref', name: closed.name, open: true } : undefined;
  };

  const resolveFor =
    (owner: Entry): Resolve =>
    (wrapped) => {
      const ast = unwrap(wrapped);
      if (!named.has(ast)) {
        named.set(ast, nameFor(owner, ast));
      }
      return named.get(ast);
    };

  return entries.map((entry) => ({ entry, type: describeAst(entry.schema.ast, resolveFor(entry)) }));
};

/** The fields `described` adds to or changes from its base, and the base's fields it lacks. */
export const diffBase = (
  described: Described,
  all: readonly Described[],
): { readonly own: readonly FieldDesc[]; readonly omitted: readonly string[] } | undefined => {
  const base = all.find(({ entry }) => entry.name === described.entry.base);
  if (!base || base.type.kind !== 'object' || described.type.kind !== 'object') {
    return undefined;
  }
  const inherited = new Set(base.type.fields.map((field) => JSON.stringify(field)));
  const names = new Set(described.type.fields.map(({ name }) => name));
  return {
    own: described.type.fields.filter((field) => !inherited.has(JSON.stringify(field))),
    omitted: base.type.fields.map(({ name }) => name).filter((name) => !names.has(name)),
  };
};

//
// JSON Schema.
//

export type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json };
export type JsonObject = { readonly [key: string]: Json };

const refOf = (name: string): string => `#/$defs/${name}`;

const literalType = (values: readonly Literal[]): JsonObject =>
  values.every((value) => typeof value === 'string')
    ? { type: 'string' }
    : values.every((value) => typeof value === 'number')
      ? { type: 'number' }
      : {};

const jsonOf = (desc: TypeDesc): JsonObject => {
  switch (desc.kind) {
    case 'ref':
      return { $ref: refOf(desc.name) };
    case 'echo-ref':
      return {
        type: 'object',
        description: `An ECHO reference to ${desc.target}.`,
        properties: { '/': { type: 'string' } },
        required: ['/'],
      };
    case 'string':
    case 'boolean':
      return { type: desc.kind };
    case 'any':
    case 'unknown':
      return {};
    case 'number':
      return {
        type: desc.integer ? 'integer' : 'number',
        ...(desc.minimum !== undefined ? { minimum: desc.minimum } : {}),
        ...(desc.maximum !== undefined ? { maximum: desc.maximum } : {}),
      };
    case 'literals':
      return { ...literalType(desc.values), enum: desc.values };
    case 'array':
      return { type: 'array', items: jsonOf(desc.items) };
    case 'record':
      return { type: 'object', additionalProperties: jsonOf(desc.values) };
    case 'union':
      return { anyOf: desc.members.map(jsonOf) };
    case 'object': {
      const required = desc.fields.filter(({ optional }) => !optional).map(({ name }) => name);
      return {
        type: 'object',
        properties: Object.fromEntries(
          desc.fields.map(({ name, type, description }) => [
            name,
            { ...jsonOf(type), ...(description ? { description } : {}) },
          ]),
        ),
        ...(required.length > 0 ? { required } : {}),
        ...(desc.rest ? { additionalProperties: jsonOf(desc.rest) } : {}),
      };
    }
  }
};

/** The whole ontology as one JSON Schema document: a definition per entry, and `Document` as the root. */
export const toJsonSchema = (entries: readonly Entry[] = ENTRIES): JsonObject => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'DXOS scene ontology',
  description: 'Every type a stored drawing is made of, generated from the schemas in @dxos/scene.',
  $ref: refOf('Document'),
  $defs: Object.fromEntries(
    describe(entries).map(({ entry, type }) => [
      entry.name,
      {
        description: entry.echo ? `${entry.summary} ECHO type ${entry.echo.uri}.` : entry.summary,
        ...jsonOf(type),
      },
    ]),
  ),
});

//
// Docs page.
//

/** The anchor Starlight gives a heading, so a type cell can link to another type's table. */
export const slugOf = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/ /g, '-');

const ENUMS = 'Enums';

/** The most fields a struct may have and still print inside a type cell; a larger one needs an entry of its own. */
const MAX_INLINE_FIELDS = 4;

const table = (header: readonly string[], rows: readonly (readonly string[])[]): string => {
  const widths = header.map((cell, column) => Math.max(cell.length, 3, ...rows.map((row) => row[column].length)));
  const line = (cells: readonly string[]) =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column])).join(' | ')} |`;
  return [line(header), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)].join('\n');
};

/** The first clause of a description: the page is for lookup, and the JSON Schema keeps the whole text. */
const firstClause = (description: string): string => description.split(/\. (?=[A-Z])|[;:] /)[0].replace(/\.$/, '');

const rangeOf = (desc: TypeDesc): string | undefined => {
  if (desc.kind !== 'number' || (desc.minimum === undefined && desc.maximum === undefined)) {
    return undefined;
  }
  return desc.minimum === undefined
    ? `At most ${desc.maximum}`
    : desc.maximum === undefined
      ? `At least ${desc.minimum}`
      : `${desc.minimum} to ${desc.maximum}`;
};

/** The page as Markdown for the docs site, from the same descriptions the JSON Schema is made of. */
export const toMarkdown = (entries: readonly Entry[] = ENTRIES): string => {
  const all = describe(entries);
  const byName = new Map(all.map((described) => [described.entry.name, described]));
  const byUri = new Map(all.flatMap(({ entry }) => (entry.echo ? [[entry.echo.uri, entry.name] as const] : [])));
  const isEnum = ({ type }: Described) => type.kind === 'literals';

  const link = (name: string): string => {
    const target = byName.get(name);
    return `[${name}](#${slugOf(target && isEnum(target) ? ENUMS : name)})`;
  };

  const typeOf = (desc: TypeDesc, path: string): string => {
    switch (desc.kind) {
      case 'ref':
        return desc.open ? `${link(desc.name)} and the kind's own fields` : link(desc.name);
      case 'echo-ref': {
        const name = byUri.get(desc.target);
        return name ? `ref to ${link(name)}` : 'ref to any object';
      }
      case 'number':
        return desc.integer ? 'integer' : 'number';
      case 'literals':
        return desc.values.map((value) => `\`${value}\``).join(' ');
      case 'array':
        return `${desc.items.kind === 'union' ? `(${typeOf(desc.items, path)})` : typeOf(desc.items, path)}[]`;
      case 'record':
        return `map of ${typeOf(desc.values, path)}`;
      case 'union':
        return desc.members.map((member) => typeOf(member, path)).join(' or ');
      case 'object':
        return desc.fields.length > MAX_INLINE_FIELDS || desc.rest
          ? unsupported(`the unnamed struct at \`${path}\` in a table cell: register it as an entry`)
          : `{ ${desc.fields.map((field) => `${field.name}${field.optional ? '?' : ''}: ${typeOf(field.type, path)}`).join(', ')} }`;
      default:
        return desc.kind;
    }
  };

  const fieldTable = (fields: readonly FieldDesc[], owner: string): string => {
    const rows = fields.map((field) => [
      `\`${field.name}${field.optional ? '?' : ''}\``,
      typeOf(field.type, `${owner}.${field.name}`),
      [field.description ? firstClause(field.description) : undefined, rangeOf(field.type)]
        .filter((note) => note !== undefined)
        .join('. '),
    ]);
    // A table none of whose fields has a note drops the column rather than printing it empty.
    return rows.some(([, , notes]) => notes !== '')
      ? table(['Field', 'Type', 'Notes'], rows)
      : table(
          ['Field', 'Type'],
          rows.map(([field, type]) => [field, type]),
        );
  };

  const section = (described: Described): string => {
    const { entry, type } = described;
    const diff = diffBase(described, all);
    const stored = entry.echo ? ` ECHO type \`${entry.echo.typename}\`, version ${entry.echo.version}.` : '';
    const inherits = !diff
      ? ''
      : diff.omitted.length === 0
        ? ` Extends ${link(entry.base ?? '')}.`
        : ` As ${link(entry.base ?? '')}, without ${diff.omitted.map((name) => `\`${name}\``).join(', ')}.`;
    const fields = diff ? diff.own : type.kind === 'object' ? type.fields : undefined;
    const range = rangeOf(type);
    const body =
      fields === undefined
        ? type.kind === 'union'
          ? `One of ${type.members.map((member) => typeOf(member, entry.name)).join(', ')}.`
          : `Type: ${typeOf(type, entry.name)}${range ? `, ${range.toLowerCase()}` : ''}.`
        : fields.length > 0
          ? fieldTable(fields, entry.name)
          : undefined;
    return [`### ${entry.name}`, `${entry.summary}${stored}${inherits}`, ...(body ? [body] : [])].join('\n\n');
  };

  const enums = all.filter(isEnum).map(({ entry, type }) => [`\`${entry.name}\``, typeOf(type, entry.name)]);
  const kinds = EXTERNAL_KINDS.map(({ kind, dimension, package: owner }) => [`\`${kind}\``, dimension, `\`${owner}\``]);

  return [
    '---',
    '# Generated: do not edit. Run `moon run scene:gen-ontology`.',
    'title: Scene schema',
    'description: Every type a stored drawing is made of, generated from the schemas in @dxos/scene.',
    '---',
    '',
    'This page lists every type that makes up a stored drawing: its scenes, layouts, models, elements and styles.',
    "Use it to look up a field's name and type when you read or write a drawing's records.",
    '',
    'A `?` after a field name marks it optional, and a linked type opens that type. A type that extends another lists',
    'only the fields that differ. The page is generated from the schemas in `@dxos/scene`, whose source also holds the',
    'same types as one JSON Schema document, `ontology.schema.json`.',
    '',
    ...GROUPS.flatMap(({ name, summary }) => [
      `## ${name}`,
      '',
      summary,
      '',
      ...all
        .filter((described) => described.entry.group === name && !isEnum(described))
        .flatMap((described) => [section(described), '']),
    ]),
    `## ${ENUMS}`,
    '',
    'Each enum is a set of literal values.',
    '',
    table(['Name', 'Values'], enums),
    '',
    '## Other kinds',
    '',
    'These element kinds have no schema in `@dxos/scene`. An element of one carries the base fields, and the package',
    'named draws it and defines any fields of its own.',
    '',
    table(['Kind', 'Dimension', 'Package'], kinds),
    '',
  ].join('\n');
};
