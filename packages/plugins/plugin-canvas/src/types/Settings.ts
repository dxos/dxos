//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** The built-in style sets, by id; a drawing may name one of its own, which wins over this default. */
export const StyleSetChoice = Schema.Union([
  Schema.Literal('classic').annotate({ title: 'Classic' }),
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
  styleSet: Schema.optional(
    StyleSetChoice.annotate({
      title: 'Style set',
      description: 'How shapes and links are drawn, unless a drawing picks its own.',
    }),
  ),
  background: Schema.optional(
    BackgroundChoice.annotate({
      title: 'Background',
      description: "What is drawn under the scene; unset, the style set's own.",
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
