//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const EntityKind = Schema.Literal('person', 'org', 'place', 'event', 'concept', 'thing');
export type EntityKind = Schema.Schema.Type<typeof EntityKind>;

export const Entity = Schema.Struct({
  id: Schema.String,
  kind: EntityKind,
  label: Schema.String,
  aliases: Schema.Array(Schema.String),
  /** DXN of a canonical ECHO object (Person/Organization/Event), if resolved. */
  ref: Schema.optional(Schema.String),
});
export interface Entity extends Schema.Schema.Type<typeof Entity> {}
