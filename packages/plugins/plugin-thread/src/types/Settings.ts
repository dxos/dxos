//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(Schema.Struct({}));
export type Settings = Schema.Schema.Type<typeof Settings>;
