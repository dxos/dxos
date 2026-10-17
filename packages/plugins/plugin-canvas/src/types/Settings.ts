//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** The built-in themes, by id: a style set on a background, some held light or dark. */
export const ThemeChoice = Schema.Union([
  Schema.Literal('glass-night').annotate({ title: 'Glass' }),
  Schema.Literal('night').annotate({ title: 'Plastic' }),
  Schema.Literal('paper').annotate({ title: 'Paper' }),
  Schema.Literal('flat').annotate({ title: 'Flat' }),
  Schema.Literal('outline').annotate({ title: 'Outline' }),
]);
export type ThemeChoice = Schema.Schema.Type<typeof ThemeChoice>;

/** The built-in style sets, by id, for a drawing that overrides its theme's. */
export const StyleSetChoice = Schema.Union([
  Schema.Literal('flat').annotate({ title: 'Flat' }),
  Schema.Literal('outline').annotate({ title: 'Outline' }),
  Schema.Literal('glass').annotate({ title: 'Glass' }),
]);
export type StyleSetChoice = Schema.Schema.Type<typeof StyleSetChoice>;

/** The built-in backgrounds, by id. */
export const BackgroundChoice = Schema.Union([
  Schema.Literal('plain').annotate({ title: 'Plain' }),
  Schema.Literal('dots').annotate({ title: 'Dots' }),
  Schema.Literal('lines').annotate({ title: 'Lines' }),
  Schema.Literal('glow').annotate({ title: 'Glow' }),
  Schema.Literal('paper').annotate({ title: 'Paper' }),
]);
export type BackgroundChoice = Schema.Schema.Type<typeof BackgroundChoice>;

/**
 * The canvas variant's user preferences. Each one maps to a `SceneView` prop, so a setting that is
 * not wired to anything cannot appear here; per-document state (the camera, the snap toggle) stays on
 * the view, where two windows of one drawing keep their own.
 */
export const Settings = Schema.Struct({
  showToolbar: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Show toolbar',
      description: 'Display the toolbar over the canvas.',
    }),
  ),
  showPalette: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Show palette',
      description: 'Display the node and link palette over the canvas.',
    }),
  ),
  liveDepth: Schema.optional(
    Schema.Number.annotate({
      title: 'Live depth',
      description: 'How many nested scenes render live; deeper portals draw as previews.',
    }),
  ),
  theme: Schema.optional(
    ThemeChoice.annotate({
      title: 'Theme',
      description: 'How shapes, links and the canvas are drawn, unless a drawing picks its own.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
