//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export type Backend = 'edge' | 'local';

export const Settings = Schema.Struct({
  backend: Schema.optional(
    Schema.Literals(['edge', 'local']).annotate({
      title: 'Backend',
      description:
        'Where sandboxes run: on EDGE, or as processes on this computer confined by the OS sandbox (desktop app only).',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.succeed('edge' as const))),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
