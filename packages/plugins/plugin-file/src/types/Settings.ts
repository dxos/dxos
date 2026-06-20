//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const DEFAULT_BACKEND_ID = 'inline';

export const Settings = Schema.mutable(
  Schema.Struct({
    backend: Schema.optional(
      Schema.String.annotations({
        title: 'File storage backend',
        description:
          'Where uploaded files are stored. Defaults to inline (bytes saved on the ECHO object). Install additional plugins (e.g. WNFS) to add external backends.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
