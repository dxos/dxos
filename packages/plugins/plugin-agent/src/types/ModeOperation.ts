//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import * as Memory from './Memory.ts';

export const ListedMode = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  skills: Schema.Array(Schema.String).annotate({ description: 'Registry keys of the skills the mode binds.' }),
  records: Schema.optional(Schema.Array(Memory.Kind)),
  current: Schema.Boolean,
});

export interface ListedMode extends Schema.Schema.Type<typeof ListedMode> {}

/** Lists the agent's modes and which one the conversation is in. */
export const ListModes = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.listModes'),
    name: 'List modes',
    description:
      'Lists the modes the agent can work in (conversation, note-taker, interviewer, relay) and the current one.',
    icon: 'ph--sliders-horizontal--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    chat: Ref.Ref(Chat.Chat).annotate({ description: 'The conversation (the chat in your context).' }),
  }),
  output: Schema.Struct({
    current: Schema.String,
    modes: Schema.Array(ListedMode),
  }),
});

/** Rebinds the conversation's mode skills; the base skills (conversation, modes, relay) stay bound. */
export const SwitchMode = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.switchMode'),
    name: 'Switch mode',
    description:
      'Switches this conversation to another mode by name (e.g. "Note-taker", "Interviewer", "Conversation"). Relay stays available in every mode.',
    icon: 'ph--swap--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    chat: Ref.Ref(Chat.Chat).annotate({ description: 'The conversation (the chat in your context).' }),
    mode: Schema.String.annotate({ description: 'The name of the mode to switch to.' }),
  }),
  output: Schema.Struct({
    mode: Schema.String,
    skills: Schema.Array(Schema.String).annotate({ description: 'Registry keys now bound by the mode.' }),
  }),
});
