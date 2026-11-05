//
// Copyright 2026 DXOS.org
//

// Styles: one mechanism for both dimensions (named, catalogued, overridden), with a property set per dimension
// (COMMON-CORE.md decisions 6, 19, 20).

import * as Schema from 'effect/Schema';

import { AnimatableAnnotation } from '@dxos/animation';
import { Annotation, DXN, Type } from '@dxos/echo';

import { LINE_STYLES, styleFields } from './element.ts';

/** Hues that read the same in every theme, for drawings that need true black and white. */
export const FIXED_HUES = ['black', 'white'] as const;

/** How a line is drawn, including the hand-drawn stroke diagrams use. */
export const STYLE_LINES = [...LINE_STYLES, 'sketchy'] as const;

/** Stroke weight and text size together, as a diagram scales them. */
export const STYLE_WEIGHTS = ['s', 'm', 'l', 'xl'] as const;

/** A 2D look: the canvas node style, extended with the diagram vocabulary so one set serves both. */
export const Style2D = Schema.Struct({
  ...styleFields,
  lineStyle: Schema.optional(Schema.Literals(STYLE_LINES).annotate({ title: 'Line style' })),
  /** A patterned fill (hatching) rather than a flat one. */
  pattern: Schema.optional(Schema.Boolean),
  weight: Schema.optional(Schema.Literals(STYLE_WEIGHTS).annotate({ title: 'Weight' })),
});
export type Style2D = Schema.Schema.Type<typeof Style2D>;

/** A 3D look: a material over the theme's hue and tone. */
export const Style3D = Schema.Struct({
  hue: Schema.optional(Schema.String.pipe(AnimatableAnnotation.set('color'))),
  tone: Schema.optional(Schema.Literals([0, 1, 2, 3])),
  surface: Schema.optional(Schema.Literals(['solid', 'tint', 'glass', 'none'])),
  border: Schema.optional(Schema.Boolean),
  rounded: Schema.optional(Schema.Boolean),
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

/** A reusable set of styles that drawings reference; the theme's defaults are one too. */
export class StyleCatalog extends Type.makeObject<StyleCatalog>(DXN.make('org.dxos.type.scene.styleCatalog', '0.1.0'))(
  Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    dim: Schema.Literals(['2d', '3d']),
    // One struct over both property sets (ECHO stores only discriminated unions); `dim` says which applies.
    styles: Schema.Record(Schema.String, Schema.Struct({ ...Style3D.fields, ...Style2D.fields })),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--palette--regular', hue: 'sky' }),
    Annotation.UserType.set(),
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

/** A 2D style as a 3D one: its fill becomes the surface (a light tone a tint); 2D-only fields are dropped. */
export const liftStyle = (style: Style2D): Style3D => {
  const { hue, tone, border, rounded, opacity, fill } = style;
  const tint = fill === true && tone === 3;
  return Object.fromEntries(
    Object.entries({
      hue,
      tone: tint ? undefined : tone,
      surface: fill === undefined ? undefined : fill ? (tint ? 'tint' : 'solid') : 'none',
      border,
      rounded,
      opacity,
    }).filter(([, value]) => value !== undefined),
  );
};

/** A 3D style as a 2D one: its surface becomes the fill (a tint the lightest tone); 3D-only fields are dropped. */
export const flattenStyle = (style: Style3D): Style2D => {
  const { hue, tone, surface, border, rounded, opacity } = style;
  return Object.fromEntries(
    Object.entries({
      hue,
      tone: tone ?? (surface === 'tint' ? 3 : undefined),
      fill: surface === undefined ? undefined : surface !== 'none',
      border,
      rounded,
      opacity,
    }).filter(([, value]) => value !== undefined),
  );
};
