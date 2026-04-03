//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

export const SpaceSettingsSchema = Schema.mutable(
  Schema.Struct({
    /**
     * Show closed spaces.
     */
    showHidden: Schema.Boolean,
  }),
);

export type SpaceSettingsProps = Schema.Schema.Type<typeof SpaceSettingsSchema>;
