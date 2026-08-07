//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

import { meta } from '#meta';

/**
 * Whether the user has dismissed the Welcome content on the default space's Home page. Stored on
 * the settings space's `properties` meta (via {@link Annotation.set}) so the choice is app-wide and
 * replicates across the user's devices.
 */
export const WelcomeDismissedAnnotation = Annotation.make({
  id: `${meta.profile.key}.welcomeDismissed`,
  schema: Schema.Boolean,
});
