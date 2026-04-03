//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

export const ThreadSettingsSchema = Schema.mutable(Schema.Struct({}));
export type ThreadSettingsProps = Schema.Schema.Type<typeof ThreadSettingsSchema>;
