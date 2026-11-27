//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Support } from '../types/index.ts';
import * as Contract from './Contract.ts';

/** Returns what the space's canonical documents say about the topics a question mentions. */
export const Researcher = Contract.make('org.dxos.stories.support.researcher', {
  version: '0.1.0',
  methods: {
    research: {
      payload: Schema.Struct({
        question: Schema.String,
        /** The rest of the message, read for topics the question does not name itself. */
        context: Schema.optional(Schema.String),
      }),
      success: Schema.Struct({
        topics: Schema.Array(Schema.String),
        evidence: Schema.Array(Support.Evidence),
      }),
    },
  },
});

export type Implementation = Contract.Implementation<typeof Researcher>;
