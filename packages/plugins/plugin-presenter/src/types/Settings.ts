//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

export const PresenterSettingsSchema = Schema.mutable(
  Schema.Struct({
    presentCollections: Schema.optional(Schema.Boolean),
  }),
);

export type PresenterSettingsProps = Schema.Schema.Type<typeof PresenterSettingsSchema>;
