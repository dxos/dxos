//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

import { meta } from '#meta';

/**
 * Telemetry preferences on the settings space's `properties`, so a choice made on one device
 * replicates to the rest. Local storage keeps a mirror for the window before the space is
 * readable at boot; the settings-sync module reconciles the two.
 */
export const Enabled = Annotation.make({
  id: `${meta.profile.key}.enabled`,
  schema: Schema.Boolean,
});

/** Whether AI prompts, responses and tool names may be captured, on top of {@link Enabled}. */
export const AiContentCapture = Annotation.make({
  id: `${meta.profile.key}.aiContentCapture`,
  schema: Schema.Boolean,
});
