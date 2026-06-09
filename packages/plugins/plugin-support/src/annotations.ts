//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

import { meta } from '#meta';

/**
 * Whether the user has dismissed the Welcome content on a space's Home page. Stored on the space's
 * `properties` meta (via {@link Annotation.set}) so it replicates across the user's devices.
 */
export const WelcomeDismissedAnnotation = Annotation.make({
  id: `${meta.id}.welcomeDismissed`,
  schema: Schema.Boolean,
});
