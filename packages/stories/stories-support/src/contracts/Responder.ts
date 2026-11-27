//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';

import { Support } from '../types/index.ts';
import * as Contract from './Contract.ts';
import { Sender } from './EntityExtractor.ts';

/** The parts of a message a reply is built from. */
export const Replied = Schema.Struct({
  id: Obj.ID,
  subject: Schema.String,
  /** When the message was sent; the draft is dated from it, so a re-run writes the same draft. */
  created: Schema.String,
  threadId: Schema.optional(Schema.String),
  sender: Sender,
});
export interface Replied extends Schema.Schema.Type<typeof Replied> {}

/** Decides whether a question can be answered from its evidence, and writes the draft when it can. */
export const Responder = Contract.make('org.dxos.stories.support.responder', {
  version: '0.1.0',
  methods: {
    respond: {
      payload: Schema.Struct({
        /** URI of the mailbox the draft belongs to. */
        mailbox: Schema.String,
        message: Replied,
        question: Schema.String,
        evidence: Schema.Array(Support.Evidence),
      }),
      success: Schema.Struct({
        decision: Support.Decision,
        /** URI of the draft, when the decision is a draft. */
        draft: Schema.optional(Schema.String),
      }),
    },
  },
});

export type Implementation = Contract.Implementation<typeof Responder>;
