//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

// TODO(burdon): Move to echo-protocol?

export const Tag = Schema.Struct({
  label: Schema.String,
  hue: Schema.optional(Schema.String),
});

export type Tag = Schema.Schema.Type<typeof Tag>;

export const sortTags = ({ label: a }: Tag, { label: b }: Tag) => a.localeCompare(b);
