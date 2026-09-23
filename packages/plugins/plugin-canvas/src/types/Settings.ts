//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

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
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
