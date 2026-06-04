//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/** Migration version stored on space properties meta. */
export const MigrationVersionAnnotation = Annotation.make({
  id: 'org.dxos.migrations.version',
  schema: Schema.String,
});
