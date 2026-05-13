//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    /**
     * Show closed spaces.
     */
    showHidden: Schema.Boolean,
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
