//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Harness } from '@dxos/assistant';
import { Operation, TriggerEvent } from '@dxos/compute';
import { AgentService } from '@dxos/compute/AgentService';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Chat } from '../../../types';

export const Relay = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.relay'),
    name: 'Agent Relay',
    description: 'Qualifies a subscription event with a cheap model and forwards it onto the durable agent session.',
    icon: 'ph--funnel--regular',
  },
  input: Schema.Struct({
    /** The chat whose durable session receives the event (carries feed, instructions, and agent). */
    chat: Schema.suspend(() => Ref.Ref(Chat.Chat)),
    event: Schema.optional(TriggerEvent.TriggerEvent),
    /** Synthetic wake prompt (e.g. a cron tick) delivered instead of an event payload. */
    prompt: Schema.optional(Schema.String),
    /** Skip the cheap-model relevance check (default: qualify when an event is present). */
    qualify: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
  services: [AiService.AiService, Database.Service, AgentService],
});

export const GetContext = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.agent.getContext'),
    name: 'Get Agent Context',
    description: 'Get the context of an agent.',
    icon: 'ph--info--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    instructions: Schema.String,
    checklist: Schema.String,
  }),
  services: [Harness.HarnessService, Database.Service],
});
