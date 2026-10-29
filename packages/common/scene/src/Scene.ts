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

/** Kinds every scene may hold; the dimension's own kinds are listed separately. */
export const KINDS_SHARED: readonly string[] = ['link', 'label', 'scene', 'group', 'instance'];
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

/** An arrangement a group applies to its members, kept so layout can be re-run. */
export const Layout = Schema.Struct({
  kind: Schema.String,
  params: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
});
export type Layout = Schema.Schema.Type<typeof Layout>;

/** Fields every element has, in either dimension. */
export const BaseElement = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
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
  layout: Schema.optional(Layout),
  /** Set when a person placed the element, so layout leaves it where it is. */
  pinned: Schema.optional(Schema.Boolean),
  /** Kind-specific fields, validated by the kind's registration. */
  props: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
});
export type BaseElement = Schema.Schema.Type<typeof BaseElement>;

// Geometry is optional because a link's comes from its bindings.
const geometry2D = {
  center: Schema.optional(Vec2.pipe(AnimatableAnnotation.set('point'))),
  size: Schema.optional(Size2.pipe(AnimatableAnnotation.set('size'))),
  rotation: Schema.optional(Schema.Number.pipe(AnimatableAnnotation.set('number'))),
};

const geometry3D = {
  center: Schema.optional(Vec3.pipe(AnimatableAnnotation.set('vec3'))),
  scale: Schema.optional(Vec3.pipe(AnimatableAnnotation.set('vec3'))),
  /** Euler degrees. */
  rotation: Schema.optional(Vec3.pipe(AnimatableAnnotation.set('rotation'))),
};

/**
 * In record form a child scene is named by its scene id; in ECHO it is also a Ref to the child Scene object, which an
 * element closing a cycle goes without, so the id is kept beside it.
 */
const childById = { scene: Schema.optional(Schema.String) };
const childByRef = { ...childById, child: Schema.optional(Ref.Ref(Obj.Unknown)) };

export const Element2D = Schema.Struct({ ...BaseElement.fields, ...geometry2D, ...childById });
export type Element2D = Schema.Schema.Type<typeof Element2D>;

export const Element3D = Schema.Struct({ ...BaseElement.fields, ...geometry3D, ...childById });
export type Element3D = Schema.Schema.Type<typeof Element3D>;

export type Element = Element2D | Element3D;

export const StoredElement2D = Schema.Struct({ ...BaseElement.fields, ...geometry2D, ...childByRef });
export type StoredElement2D = Schema.Schema.Type<typeof StoredElement2D>;

export const StoredElement3D = Schema.Struct({ ...BaseElement.fields, ...geometry3D, ...childByRef });
export type StoredElement3D = Schema.Schema.Type<typeof StoredElement3D>;

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

/** The fields every scene has, over its element and camera schemas. */
export const makeSceneSchema = <E extends Schema.Top, C extends Schema.Top>(element: E, camera: C) =>
  Schema.Struct({
    name: Schema.optional(Schema.String),
    theme: Schema.optional(Schema.String),
    /** A reusable scene that `instance` elements place. */
    component: Schema.optional(Schema.Boolean),
    camera,
    elements: Schema.Record(Schema.String, element),
  });

/** A scene of elements `E` seen through a camera `C`; both dimensions' records and ECHO objects have this shape. */
export type Scene<E, C> = {
  readonly name?: string;
  readonly theme?: string;
  readonly component?: boolean;
  readonly camera: C;
  readonly elements: { readonly [id: string]: E };
};

export const SceneRecord2D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('2d'),
  ...makeSceneSchema(Element2D, Camera2D).fields,
});
export type SceneRecord2D = Schema.Schema.Type<typeof SceneRecord2D>;

export const SceneRecord3D = Schema.Struct({
  id: Schema.String,
  dim: Schema.Literal('3d'),
  ...makeSceneSchema(Element3D, Camera3D).fields,
});
export type SceneRecord3D = Schema.Schema.Type<typeof SceneRecord3D>;

export type SceneRecord = SceneRecord2D | SceneRecord3D;

/** Scenes parsed or printed together; the first is the root. */
export type SceneDocument = { scenes: readonly SceneRecord[] };

/** A 2D scene; its elements are records inside this one object (design D-6). ECHO reserves `id`, so its own is `key`. */
export class Scene2D extends Type.makeObject<Scene2D>(DXN.make('org.dxos.type.scene.scene2d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeSceneSchema(StoredElement2D, Camera2D).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--square--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** A 3D scene; its elements are records inside this one object (design D-6). ECHO reserves `id`, so its own is `key`. */
export class Scene3D extends Type.makeObject<Scene3D>(DXN.make('org.dxos.type.scene.scene3d', '0.1.0'))(
  Schema.Struct({ key: Schema.String, ...makeSceneSchema(StoredElement3D, Camera3D).fields }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--cube--regular', hue: 'sky' }),
    Annotation.UserType.set(),
  ),
) {}

/** The kinds a scene of this dimension may hold. */
export const kindsOf = (dim: Dimension): readonly string[] => [
  ...KINDS_SHARED,
  ...(dim === '2d' ? KINDS_2D : KINDS_3D),
];
