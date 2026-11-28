//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Contract from './Contract.ts';

/** Who sent a message, as the message states it. */
export const Sender = Schema.Struct({
  email: Schema.String,
  name: Schema.optional(Schema.String),
});
export interface Sender extends Schema.Schema.Type<typeof Sender> {}

/** Matches a message's sender against the people and organizations in the space, creating what is missing. */
export const EntityExtractor = Contract.make('org.dxos.stories.support.entityExtractor', {
  version: '0.1.0',
  methods: {
    extract: {
      payload: Schema.Struct({ sender: Sender }),
      success: Schema.Struct({
        /** URI of the sender's Person. */
        person: Schema.optional(Schema.String),
        /** URI of the sender's Organization; absent for a free-mail address. */
        organization: Schema.optional(Schema.String),
        /** Labels of the objects this call made. */
        created: Schema.Array(Schema.String),
        /** Labels of the objects that already existed. */
        matched: Schema.Array(Schema.String),
      }),
    },
  },
});

export type Implementation = Contract.Implementation<typeof EntityExtractor>;
