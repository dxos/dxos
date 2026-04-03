//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

export const ObservabilitySettingsSchema = Schema.mutable(
  Schema.Struct({
    enabled: Schema.Boolean,
    // TODO(wittjosiah): Separate settings for each observability feature.
    // metrics?: boolean;
    // telemetry?: boolean;
    // errors?: boolean;
  }),
);

export type ObservabilitySettingsProps = Schema.Schema.Type<typeof ObservabilitySettingsSchema>;
