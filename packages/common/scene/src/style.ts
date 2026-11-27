//
// Copyright 2026 DXOS.org
//

// Styles: one mechanism for both dimensions (named, catalogued, overridden), with a property set per dimension
// (COMMON-CORE.md decisions 6, 19, 20).

import * as Schema from 'effect/Schema';

import { AnimatableAnnotation } from '@dxos/animation';
import { Annotation, DXN, Type } from '@dxos/echo';

import { Color } from './color.ts';
import { Style2D } from './element.ts';
import { Corners, Fill, Stroke } from './vocabulary.ts';

/** Hues that read the same in every theme, for drawings that need true black and white. */
export const FIXED_HUES = ['black', 'white'] as const;

/** A 3D look: a material over the theme's colour, in the words the 2D look uses for what the two share. */
export const Style3D = Schema.Struct({
  color: Schema.optional(Color.pipe(AnimatableAnnotation.set('color'))),
  /** The surface: `tint` a light wash of the colour, `glass` a translucent material. */
  fill: Schema.optional(Fill),
  /** The edges of the solid; `none` draws none. */
  stroke: Schema.optional(Stroke),
  corners: Schema.optional(Corners),
  opacity: Schema.optional(Schema.Number.pipe(AnimatableAnnotation.set('number'))),
  metalness: Schema.optional(Schema.Number),
  roughness: Schema.optional(Schema.Number),
  emissive: Schema.optional(Schema.Number),
});
export type Style3D = Schema.Schema.Type<typeof Style3D>;

/** A model's named 2D style: the look, and the name a style picker shows. */
export const NamedStyle2D = Schema.Struct({ name: Schema.optional(Schema.String), ...Style2D.fields });
export type NamedStyle2D = Schema.Schema.Type<typeof NamedStyle2D>;

/** A model's named 3D style. */
export const NamedStyle3D = Schema.Struct({ name: Schema.optional(Schema.String), ...Style3D.fields });
export type NamedStyle3D = Schema.Schema.Type<typeof NamedStyle3D>;

/** A named style of either dimension, with a display name. */
export type NamedStyle<S> = S & { readonly name?: string };

/**
 * One style of a catalog: one struct over both property sets (ECHO stores only discriminated unions), of which the
 * catalog's `dim` says which applies.
 */
export const CatalogStyle = Schema.Struct({ ...Style3D.fields, ...Style2D.fields });
export type CatalogStyle = Schema.Schema.Type<typeof CatalogStyle>;

/** A reusable set of styles that drawings reference; the theme's defaults are one too. */
export class StyleCatalog extends Type.makeObject<StyleCatalog>(DXN.make('org.dxos.type.scene.styleCatalog', '0.2.0'))(
  Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    dim: Schema.Literals(['2d', '3d']),
    styles: Schema.Record(Schema.String, CatalogStyle),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--palette--regular', hue: 'sky' }),
  ),
) {}

/** A reference to a catalog entry: the catalog's key and the style's, so equal keys in different catalogs differ. */
export const styleRef = (catalog: string, key: string): string => `${catalog}:${key}`;

type StyleSet<S> = { readonly [id: string]: Partial<S> | undefined };

/**
 * An element's look, nearest first and field by field: its own overrides, then the layout's override of its named
 * style, the model's definition, each catalog in order, and the defaults (the theme's catalog).
 */
export const resolveStyle = <S extends object>(
  element: { readonly style?: string; readonly overrides?: Partial<S> },
  layout: { readonly styles?: StyleSet<S> },
  model: { readonly styles: StyleSet<S> },
  catalogs: readonly { readonly key: string; readonly styles: StyleSet<S> }[],
  defaults: StyleSet<S>,
): Partial<S> => {
  const id = element.style;
  const levels: (Partial<S> | undefined)[] = [];
  if (id !== undefined) {
    const separator = id.indexOf(':');
    if (separator > 0) {
      // A catalog reference resolves in its own catalog only.
      const catalog = catalogs.find((candidate) => candidate.key === id.slice(0, separator));
      levels.push(catalog?.styles[id.slice(separator + 1)]);
    } else {
      levels.push(defaults[id], ...[...catalogs].reverse().map((catalog) => catalog.styles[id]), model.styles[id]);
      levels.push(layout.styles?.[id]);
    }
  }
  levels.push(element.overrides);
  // A level sets only the fields it defines; a style's name is not part of the look.
  const look: Partial<S> = {};
  for (const level of levels) {
    for (const [key, value] of Object.entries(level ?? {})) {
      if (value !== undefined && key !== 'name') {
        Reflect.set(look, key, value);
      }
    }
  }
  return look;
};

/** The fields a look has in either dimension. */
const SHARED_STYLE_FIELDS = ['color', 'fill', 'stroke', 'corners', 'opacity'] as const;

const sharedStyle = (style: Style2D | Style3D): Partial<Style2D & Style3D> =>
  Object.fromEntries(
    SHARED_STYLE_FIELDS.flatMap((field) => (style[field] === undefined ? [] : [[field, style[field]]])),
  );

/** A 2D style as a 3D one: the fields the two share; 2D-only fields are dropped. */
export const liftStyle = (style: Style2D): Style3D => sharedStyle(style);

/** A 3D style as a 2D one: the fields the two share; 3D-only fields are dropped. */
export const flattenStyle = (style: Style3D): Style2D => sharedStyle(style);
