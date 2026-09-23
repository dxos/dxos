//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { TypeSafeResolver } from '@dxos/ai/resolvers';

export const Settings = Schema.Struct({
  /**
   * Where System One is called.
   *
   * Configurable because the vendor's API sends no `access-control-allow-origin` for any origin, so
   * a browser cannot call it directly: a deployment points this at whatever proxies for it until
   * the call is routed server-side.
   */
  endpoint: Schema.optional(
    Schema.String.annotate({
      title: 'API endpoint',
      description: 'System One endpoint, or a proxy in front of it. Defaults to the vendor.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaults = (): Settings => ({ endpoint: TypeSafeResolver.DEFAULT_ENDPOINT });
