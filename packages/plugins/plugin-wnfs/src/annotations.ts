//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/** WNFS filesystem state stored on space properties meta. */
export const WnfsStateAnnotation = Annotation.make({
  id: 'org.dxos.plugin.wnfs.state',
  schema: Schema.Struct({
    accessKey: Schema.String,
    privateForestCid: Schema.String,
  }),
});
