//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** Per-device settings: each browser or device opts in to push on its own. */
export const Settings = Schema.Struct({
  notifications: Schema.Boolean.annotate({
    title: 'Notifications on this device',
    description: 'Show a system notification for invitations and messages, even while Composer is closed.',
  }),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
