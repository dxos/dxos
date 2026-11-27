//
// Copyright 2026 DXOS.org
//

// The layouts, models and style catalogs a drawing stored before version 0.2.0 of the stored types, and the migration of each to the
// current type. Kept solely so the migrations can read existing data; nothing constructs these.

import * as Schema from 'effect/Schema';

import { DXN, Migration, Obj, Ref, Type } from '@dxos/echo';

import { Layer, Style2D, withCurrentKind } from './element.ts';
import * as Scene from './Scene.ts';
import * as Style from './style.ts';
import {
  ELEMENT_2D_GUARDS,
  ELEMENT_3D_GUARDS,
  fieldGuards,
  upgradeConstraint,
  upgradeElement,
  upgradeObject,
  upgradeStyle,
  validated,
} from './upgrade.ts';

/** Records of any shape: what version 0.1.0 stored is not a record by the current schemas. */
const Records = Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Any));
type Records = Schema.Schema.Type<typeof Records>;

const layoutFields = {
  key: Schema.String,
  name: Schema.optional(Schema.String),
  model: Schema.optional(Ref.Ref(Obj.Unknown)),
  elements: Records,
  styles: Schema.optional(Records),
  layers: Schema.optional(Schema.Record(Schema.String, Layer)),
  kind: Schema.optional(Scene.LayoutKind),
  anonymous: Schema.optional(Schema.Boolean),
  arrange: Schema.optional(Scene.Arrangement),
  props: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
};

const modelFields = {
  key: Schema.String,
  name: Schema.optional(Schema.String),
  objects: Records,
  styles: Schema.optional(Records),
  catalogs: Schema.optional(Schema.Array(Ref.Ref(Style.StyleCatalog))),
};

export class Layout2D extends Type.makeObject<Layout2D>(DXN.make('org.dxos.type.scene.layout2d', '0.1.0'))(
  Schema.Struct({
    ...layoutFields,
    grid: Schema.optional(Schema.Number),
    lattice: Schema.optional(Scene.Lattice),
    constraints: Schema.optional(Schema.Array(Schema.Record(Schema.String, Schema.Any))),
  }),
) {}

export class Layout3D extends Type.makeObject<Layout3D>(DXN.make('org.dxos.type.scene.layout3d', '0.1.0'))(
  Schema.Struct(layoutFields),
) {}

export class Model2D extends Type.makeObject<Model2D>(DXN.make('org.dxos.type.scene.model2d', '0.1.0'))(
  Schema.Struct(modelFields),
) {}

export class Model3D extends Type.makeObject<Model3D>(DXN.make('org.dxos.type.scene.model3d', '0.1.0'))(
  Schema.Struct(modelFields),
) {}

export class StyleCatalog extends Type.makeObject<StyleCatalog>(DXN.make('org.dxos.type.scene.styleCatalog', '0.1.0'))(
  Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    dim: Schema.Literals(['2d', '3d']),
    styles: Records,
  }),
) {}

/**
 * The stored types before version 0.2.0. A client must know them to read an object stored at one: an object whose
 * type it does not know is added with no type, and no migration finds it afterwards.
 */
export const Types = [Layout2D, Layout3D, Model2D, Model3D, StyleCatalog];

/**
 * Each record upgraded and kept where the current schema takes it. One it does not take even field by field was no
 * record of the stored kind before either, and is left out rather than failing the object it is in.
 */
const upgradeRecords = <T>(
  records: Records,
  upgrade: (record: Records[string]) => Record<string, unknown>,
  is: (value: unknown) => value is T,
  guards: ReadonlyMap<string, (value: unknown) => boolean>,
): Record<string, T> =>
  Object.fromEntries(
    Object.entries(records).flatMap(([id, record]) => {
      const upgraded = validated(is, guards, undefined, upgrade(record));
      return upgraded === undefined ? [] : [[id, upgraded]];
    }),
  );

const upgradeStyles = <T>(
  styles: Records | undefined,
  is: (value: unknown) => value is T,
  guards: ReadonlyMap<string, (value: unknown) => boolean>,
): { styles?: Record<string, T> } =>
  styles === undefined ? {} : { styles: upgradeRecords(styles, (style) => upgradeStyle(style) ?? {}, is, guards) };

const isElement2D = Schema.is(Scene.ElementRecord2D);
const isElement3D = Schema.is(Scene.ElementRecord3D);
const isObject2D = Schema.is(Scene.StoredObject2D);
const isObject3D = Schema.is(Scene.StoredObject3D);
const isStyle2D = Schema.is(Style2D);
const isStyle3D = Schema.is(Style.Style3D);
const isNamedStyle2D = Schema.is(Style.NamedStyle2D);
const isNamedStyle3D = Schema.is(Style.NamedStyle3D);
const isCatalogStyle = Schema.is(Style.CatalogStyle);
const isConstraint = Schema.is(Scene.Constraint);
const isGridPitch = Schema.is(Scene.GridPitch);

const OBJECT_2D_GUARDS = fieldGuards(Scene.StoredObject2D.fields);
const OBJECT_3D_GUARDS = fieldGuards(Scene.StoredObject3D.fields);
const STYLE_2D_GUARDS = fieldGuards(Style2D.fields);
const STYLE_3D_GUARDS = fieldGuards(Style.Style3D.fields);
const NAMED_STYLE_2D_GUARDS = fieldGuards(Style.NamedStyle2D.fields);
const NAMED_STYLE_3D_GUARDS = fieldGuards(Style.NamedStyle3D.fields);
const CATALOG_STYLE_GUARDS = fieldGuards(Style.CatalogStyle.fields);

/** A stored 2D layout's fields in the current words. */
export const upgradeLayout2D = ({ elements, styles, constraints, grid, ...layout }: Layout2D) => ({
  ...layout,
  elements: Object.fromEntries(
    Object.entries(upgradeRecords(elements, upgradeElement, isElement2D, ELEMENT_2D_GUARDS)).map(([id, element]) => [
      id,
      withCurrentKind(element),
    ]),
  ),
  ...upgradeStyles(styles, isStyle2D, STYLE_2D_GUARDS),
  ...(isGridPitch(grid) ? { grid } : {}),
  ...(constraints ? { constraints: constraints.map(upgradeConstraint).filter(isConstraint) } : {}),
});

/** A stored 3D layout's fields in the current words. */
export const upgradeLayout3D = ({ elements, styles, ...layout }: Layout3D) => ({
  ...layout,
  elements: upgradeRecords(elements, upgradeElement, isElement3D, ELEMENT_3D_GUARDS),
  ...upgradeStyles(styles, isStyle3D, STYLE_3D_GUARDS),
});

/** A stored 2D model's fields in the current words. */
export const upgradeModel2D = ({ objects, styles, ...model }: Model2D) => ({
  ...model,
  objects: upgradeRecords(objects, upgradeObject, isObject2D, OBJECT_2D_GUARDS),
  ...upgradeStyles(styles, isNamedStyle2D, NAMED_STYLE_2D_GUARDS),
});

/** A stored 3D model's fields in the current words. */
export const upgradeModel3D = ({ objects, styles, ...model }: Model3D) => ({
  ...model,
  objects: upgradeRecords(objects, upgradeObject, isObject3D, OBJECT_3D_GUARDS),
  ...upgradeStyles(styles, isNamedStyle3D, NAMED_STYLE_3D_GUARDS),
});

/** A stored style catalog's fields in the current words. */
export const upgradeStyleCatalog = ({ styles, ...catalog }: StyleCatalog) => ({
  ...catalog,
  styles: upgradeRecords(styles, (style) => upgradeStyle(style) ?? {}, isCatalogStyle, CATALOG_STYLE_GUARDS),
});

/**
 * Version 0.1.0 to 0.2.0, one migration per stored type: every element, object and style in the current words, and an
 * element the 2D editor wrote holding its node's or link's own fields rather than a bag of them.
 */
export const Migrations: readonly Migration.Migration[] = [
  Migration.define({ from: Layout2D, to: Scene.Layout2D, transform: async (layout) => upgradeLayout2D(layout) }),
  Migration.define({ from: Layout3D, to: Scene.Layout3D, transform: async (layout) => upgradeLayout3D(layout) }),
  Migration.define({ from: Model2D, to: Scene.Model2D, transform: async (model) => upgradeModel2D(model) }),
  Migration.define({ from: Model3D, to: Scene.Model3D, transform: async (model) => upgradeModel3D(model) }),
  Migration.define({
    from: StyleCatalog,
    to: Style.StyleCatalog,
    transform: async (catalog) => upgradeStyleCatalog(catalog),
  }),
];
