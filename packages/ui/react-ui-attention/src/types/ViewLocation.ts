//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Aspect, define } from './ViewState.ts';

/**
 * Where the local user is in an object, as anchors in the object type's own format (the format its
 * comments and its `Locator` use), so a peer's view of the same object can reveal it.
 */
export const ViewLocation = Schema.Struct({
  /** The caret or selection. */
  selection: Schema.optional(Schema.String),
  /** The top of what the view shows. */
  viewport: Schema.optional(Schema.String),
});

export type ViewLocation = Schema.Schema.Type<typeof ViewLocation>;

/** View location for an object, keyed by the object's URI and stored in memory (ephemeral, per-device session). */
export const aspect: Aspect<ViewLocation> = define<ViewLocation>({
  key: 'view-location',
  backend: 'memory',
  schema: ViewLocation,
  defaultValue: () => ({}),
});
