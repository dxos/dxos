//
// Copyright 2023 DXOS.org
//
// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    enabled: Schema.Boolean,
    // TODO(wittjosiah): Separate settings for each observability feature.
    // metrics?: boolean;
    // telemetry?: boolean;
    // errors?: boolean;
  }),
);

export type Settings = Schema.Schema.Type<typeof Settings>;
