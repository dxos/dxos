//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { isTauri } from '@dxos/util';

export type Backend = 'edge' | 'local';

/** Local in the desktop app, which ships the helper that runs them; EDGE everywhere else. */
export const defaultBackend = (): Backend => (isTauri() ? 'local' : 'edge');

export const Settings = Schema.Struct({
  backend: Schema.optional(
    Schema.Literals(['edge', 'local']).annotate({
      title: 'Backend',
      description:
        'Where sandboxes run: on EDGE, or as processes on this computer confined by the OS sandbox (desktop app only, and its default).',
    }),
  ).pipe(Schema.withConstructorDefault(Effect.sync(defaultBackend))),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
