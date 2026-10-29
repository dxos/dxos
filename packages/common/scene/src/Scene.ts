//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AnimatableAnnotation, Vec3 } from '@dxos/animation';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';

export { Vec3 };

export const Vec2 = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Vec2 = Schema.Schema.Type<typeof Vec2>;

export const Size2 = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export type Size2 = Schema.Schema.Type<typeof Size2>;

export const Dimension = Schema.Literals(['2d', '3d']);
export type Dimension = Schema.Schema.Type<typeof Dimension>;

/** Kinds every layout may hold; the dimension's own kinds are listed separately. */
export const KINDS_SHARED: readonly string[] = ['link', 'label', 'group'];
export const KINDS_2D: readonly string[] = ['rect', 'ellipse', 'polygon', 'path', 'note', 'image'];
export const KINDS_3D: readonly string[] = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid', 'mesh', 'solid'];

/** Element ids may not collide with the animator's camera target. */
export const RESERVED_IDS: readonly string[] = ['camera'];

/**
 * Semantic style tokens shared by both dimensions; a theme resolves them to CSS in 2D and to materials in 3D.
 */
export const Style = Schema.Struct({
  hue: Schema.optional(Schema.String.pipe(AnimatableAnnotation.set('color'))),
  tone: Schema.optional(Schema.Literals([0, 1, 2, 3])),
  surface: Schema.optional(Schema.Literals(['solid', 'tint', 'glass', 'none'])),
  border: Schema.optional(Schema.Boolean),
  rounded: Schema.optional(Schema.Boolean),
  opacity: Schema.optional(Schema.Number.pipe(AnimatableAnnotation.set('number'))),
});
export type Style = Schema.Schema.Type<typeof Style>;

/** One end of a link: the element it is bound to, and optionally where on it. */
export const Binding = Schema.Struct({ element: Schema.String, anchor: Schema.optional(Schema.String) });
export type Binding = Schema.Schema.Type<typeof Binding>;

/** How a group places its members (ring, grid), kept so it can be re-run. */
export const Arrangement = Schema.Struct({
  kind: Schema.String,
  params: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
});
export type Arrangement = Schema.Schema.Type<typeof Arrangement>;

//
// Model: reusable objects, with no position.
//

const objectFields = {
  id: Schema.String,
  kind: Schema.String,
  style: Schema.optional(Style),
  /** Kind-specific fields, validated by the kind's registration. */
  props: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
};

/** In record form a composite object's parts name a layout by id; in ECHO they are a Ref to the Layout object. */
const partsById = { parts: Schema.optional(Schema.String) };
const partsByRef = { parts: Schema.optional(Ref.Ref(Obj.Unknown)) };

const size2D = { size: Schema.optional(Size2) };
const scale3D = { scale: Schema.optional(Vec3) };

export const Object2D = Schema.Struct({ ...objectFields, ...size2D, ...partsById });
export type Object2D = Schema.Schema.Type<typeof Object2D>;

export const Object3D = Schema.Struct({ ...objectFields, ...scale3D, ...partsById });
export type Object3D = Schema.Schema.Type<typeof Object3D>;

export type ModelObject = Object2D | Object3D;

export const StoredObject2D = Schema.Struct({ ...objectFields, ...size2D, ...partsByRef });
export type StoredObject2D = Schema.Schema.Type<typeof StoredObject2D>;

export const StoredObject3D = Schema.Struct({ ...objectFields, ...scale3D, ...partsByRef });
export type StoredObject3D = Schema.Schema.Type<typeof StoredObject3D>;

/** The fields every model has, over its object schema. */
export const makeModelSchema = <O extends Schema.Top>(object: O) =>
  Schema.Struct({
    name: Schema.optional(Schema.String),
    objects: Schema.Record(Schema.String, object),
  });

/** A library of objects `O` that elements place. */
export type Model<O> = {
  readonly name?: string;
  readonly objects: { readonly [id: string]: O };
};

//
// Layout: positioned elements.
//

/** Fields every element has, in either dimension; an element places a model object or defines its kind inline. */
export const BaseElement = Schema.Struct({
  id: Schema.String,
  /** The model object this element places; its kind, size and style are the object's unless the element sets them. */
  object: Schema.optional(Schema.String),
  /** The element's own kind, when it places no object. */
  kind: Schema.optional(Schema.String),
  /** Paint order (a fractional index); `z` is reserved for depth. */
  order: Schema.optional(Schema.String),
  layer: Schema.optional(Schema.String),
  hidden: Schema.optional(Schema.Boolean),
  locked: Schema.optional(Schema.Boolean),
  label: Schema.optional(Schema.String.pipe(AnimatableAnnotation.set('discrete'))),
  style: Schema.optional(Style),
  from: Schema.optional(Binding),
  to: Schema.optional(Binding),
  members: Schema.optional(Schema.Array(Schema.String)),
  arrange: Schema.optional(Arrangement),
  /** Set when a person placed the element, so arranging leaves it where it is. */
  pinned: Schema.optional(Schema.Boolean),
  /** Kind-specific fields, validated by the kind's registration. */
  props: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
});
export type BaseElement = Schema.Schema.Type<typeof BaseElement>;

// Geometry is optional because a link's comes from its bindings.
export const Element2D = Schema.Struct({
  ...BaseElement.fields,
  center: Schema.optional(Vec2.pipe(AnimatableAnnotation.set('point'))),
  size: Schema.optional(Size2.pipe(AnimatableAnnotation.set('size'))),
  rotation: Schema.optional(Schema.Number.pipe(AnimatableAnnotation.set('number'))),
});
export type Element2D = Schema.Schema.Type<typeof Element2D>;

export const Element3D = Schema.Struct({
  ...BaseElement.fields,
  center: Schema.optional(Vec3.pipe(AnimatableAnnotation.set('vec3'))),
  scale: Schema.optional(Vec3.pipe(AnimatableAnnotation.set('vec3'))),
  /** Euler degrees. */
  rotation: Schema.optional(Vec3.pipe(AnimatableAnnotation.set('rotation'))),
});
export type Element3D = Schema.Schema.Type<typeof Element3D>;

export type Element = Element2D | Element3D;

/** The fields every layout has, over its element schema and the form its model reference takes. */
export const makeLayoutSchema = <E extends Schema.Top, M extends Schema.Top>(element: E, model: M) =>
  Schema.Struct({
    name: Schema.optional(Schema.String),
    model: Schema.optional(model),
    elements: Schema.Record(Schema.String, element),
  });

/** Elements `E` positioned in one coordinate space, placing objects of the model `M` names. */
export type Layout<E, M = string> = {
  readonly name?: string;
  readonly model?: M;
  readonly elements: { readonly [id: string]: E };
};

//
// Scene: a layout seen through a camera.
//

export const Camera2D = Schema.Struct({ center: Vec2, zoom: Schema.Number });
export type Camera2D = Schema.Schema.Type<typeof Camera2D>;

/** Angles in degrees: yaw about the vertical axis, pitch above the horizon. */
export const Camera3D = Schema.Struct({
  target: Vec3,
  yaw: Schema.Number,
  pitch: Schema.Number,
  distance: Schema.Number,
  fov: Schema.Number,
  projection: Schema.Literals(['perspective', 'orthographic']),
});
export type Camera3D = Schema.Schema.Type<typeof Camera3D>;

/** The fields every scene has, over its camera schema and the form its layout reference takes. */
export const makeSceneSchema = <C extends Schema.Top, L extends Schema.Top>(camera: C, layout: L) =>
  Schema.Struct({
    name: Schema.optional(Schema.String),
    theme: Schema.optional(Schema.String),
    layout,
    camera,
  });

/** The layout `L` names, seen through a camera `C`. */
export type Scene<C, L = string> = {
  readonly name?: string;
  readonly theme?: string;
  readonly layout: L;
  readonly camera: C;
};

//
// Record forms: the plain data the text form reads and prints and the renderers draw.
//

export const ModelRecord2D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('2d'),
  ...makeModelSchema(Object2D).fields,
});
export type ModelRecord2D = Schema.Schema.Type<typeof ModelRecord2D>;

export const ModelRecord3D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('3d'),
  ...makeModelSchema(Object3D).fields,
});
export type ModelRecord3D = Schema.Schema.Type<typeof ModelRecord3D>;

export type ModelRecord = ModelRecord2D | ModelRecord3D;

export const LayoutRecord2D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('2d'),
  ...makeLayoutSchema(Element2D, Schema.String).fields,
});
export type LayoutRecord2D = Schema.Schema.Type<typeof LayoutRecord2D>;

export const LayoutRecord3D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('3d'),
  ...makeLayoutSchema(Element3D, Schema.String).fields,
});
export type LayoutRecord3D = Schema.Schema.Type<typeof LayoutRecord3D>;

export type LayoutRecord = LayoutRecord2D | LayoutRecord3D;

export const SceneRecord2D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('2d'),
  ...makeSceneSchema(Camera2D, Schema.String).fields,
});
export type SceneRecord2D = Schema.Schema.Type<typeof SceneRecord2D>;

export const SceneRecord3D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('3d'),
  ...makeSceneSchema(Camera3D, Schema.String).fields,
});
export type SceneRecord3D = Schema.Schema.Type<typeof SceneRecord3D>;

export type SceneRecord = SceneRecord2D | SceneRecord3D;

/** Scenes, layouts and models read or printed together; the first scene is the root. Ids are unique per kind. */
export type SceneDocument = {
  readonly scenes: readonly SceneRecord[];
  readonly layouts: readonly LayoutRecord[];
  readonly models: readonly ModelRecord[];
};

//
// ECHO objects. ECHO reserves `id`, so each object's own id is `key`.
//

/** A 2D model: its objects are records inside this one object (design D-6). */
export class Model2D extends Type.makeObject<Model2D>(DXN.make('org.dxos.type.scene.model2d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeModelSchema(StoredObject2D).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--shapes--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** A 3D model, stored as Model2D is. */
export class Model3D extends Type.makeObject<Model3D>(DXN.make('org.dxos.type.scene.model3d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeModelSchema(StoredObject3D).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--shapes--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** A 2D layout: its elements are records inside this one object, and its model is a Ref. */
export class Layout2D extends Type.makeObject<Layout2D>(DXN.make('org.dxos.type.scene.layout2d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeLayoutSchema(Element2D, Ref.Ref(Obj.Unknown)).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--squares-four--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** A 3D layout, stored as Layout2D is. */
export class Layout3D extends Type.makeObject<Layout3D>(DXN.make('org.dxos.type.scene.layout3d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeLayoutSchema(Element3D, Ref.Ref(Obj.Unknown)).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--squares-four--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** A 2D scene: a Ref to its layout and the camera that views it. */
export class Scene2D extends Type.makeObject<Scene2D>(DXN.make('org.dxos.type.scene.scene2d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeSceneSchema(Camera2D, Ref.Ref(Layout2D)).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--square--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** A 3D scene, stored as Scene2D is. */
export class Scene3D extends Type.makeObject<Scene3D>(DXN.make('org.dxos.type.scene.scene3d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeSceneSchema(Camera3D, Ref.Ref(Layout3D)).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--cube--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** The kinds an element or object of this dimension may have. */
export const kindsOf = (dim: Dimension): readonly string[] => [
  ...KINDS_SHARED,
  ...(dim === '2d' ? KINDS_2D : KINDS_3D),
];
