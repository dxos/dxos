//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

// Welcome visibility is no longer a global setting — it is a synced per-space annotation
// (see `WelcomeDismissedAnnotation`). The settings panel exposes a "Show welcome page" action
// instead of a stored field, so this schema is intentionally empty for now.
export const Settings = Schema.mutable(Schema.Struct({}));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
