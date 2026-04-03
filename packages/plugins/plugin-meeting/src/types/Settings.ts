//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

export const MeetingSettingsSchema = Schema.mutable(
  Schema.Struct({
    entityExtraction: Schema.optional(Schema.Boolean).pipe(Schema.withConstructorDefault(() => true)),
  }),
);

export type MeetingSettingsProps = Schema.Schema.Type<typeof MeetingSettingsSchema>;
