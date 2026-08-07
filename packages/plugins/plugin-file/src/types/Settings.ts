//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const DEFAULT_BACKEND_STORAGE = 'inline';

export const Settings = Schema.Struct({
  backend: Schema.optional(
    Schema.String.annotate({
      title: 'File storage backend',
      description:
        'Where uploaded files are stored. Defaults to inline (bytes saved on the ECHO object). Install additional plugins (e.g. WNFS) to add external backends.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
