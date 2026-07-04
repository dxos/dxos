//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

export const ThreadState = Schema.Literal('awaiting-mine', 'awaiting-theirs', 'resolved', 'stalled');
export type ThreadState = Schema.Schema.Type<typeof ThreadState>;

// A canonical (spec §4) conversation aggregate: messages sharing a derived threadId, with a rolling
// summary, a coarse state, and consolidated open questions / action items. Authoritative in ECHO;
// facts are advisory evidence, not the source of this object's state.
export class Thread extends Type.makeObject<Thread>(DXN.make('org.dxos.type.emailThread', '0.1.0'))(
  Schema.Struct({
    threadId: Schema.String,
    subject: Schema.String,
    summary: Schema.String,
    state: ThreadState,
    participants: Schema.Array(Schema.String),
    messageIds: Schema.Array(Schema.String),
    openQuestions: Schema.Array(Schema.String),
    actionItems: Schema.Array(Schema.String),
  }),
) {}
