//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

// TODO(burdon): Move to plugin-brain and change to class definition (like Project).
// TODO(burdon): Reconcile with Project.

// The field shape shared by a persisted `Topic` and an unaccepted `Mailbox.topicSuggestions` entry —
// extracted so promotion is `Obj.make(Topic, suggestion)` with no mapping.
export const TopicProps = Schema.Struct({
  label: Schema.String,
  summary: Schema.String,
  // TODO(burdon): Model via Relations?
  threadIds: Schema.Array(Schema.String),
  participants: Schema.Array(Schema.String),
  keywords: Schema.Array(Schema.String),
  // Open questions and action items rolled up from the topic's member threads.
  questions: Schema.Array(Schema.String),
  tasks: Schema.Array(Schema.String),
});

// A canonical (spec §4) meta-thread: a cluster of related conversations discovered at the corpus
// layer, with an optional LLM label/summary. Authoritative in ECHO; string-keyed thread references
// (like Thread.messageIds) until the entity layer firms up to DXN refs.
// TODO(burdon): Factor out (broader than email).
export class Topic extends Type.makeObject<Topic>(DXN.make('org.dxos.type.topic', '0.1.0'))(TopicProps) {}
