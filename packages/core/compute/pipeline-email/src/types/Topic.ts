//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

// A canonical (spec §4) meta-thread: a cluster of related conversations discovered at the corpus
// layer, with an optional LLM label/summary. Authoritative in ECHO; string-keyed thread references
// (like Thread.messageIds) until the entity layer firms up to DXN refs.
export class Topic extends Type.makeObject<Topic>(DXN.make('org.dxos.type.emailTopic', '0.1.0'))(
  Schema.Struct({
    label: Schema.String,
    summary: Schema.String,
    threadIds: Schema.Array(Schema.String),
    participants: Schema.Array(Schema.String),
    keywords: Schema.Array(Schema.String),
  }),
) {}
