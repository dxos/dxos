//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, DXN, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { MemoryOperation, TriggerOperation } from '#types';

import { RELAY_RULES } from './relay-rules.ts';

/**
 * The skill's end-request hook: reads the turn's new messages into facts, then fires the agent's
 * triggers they match. Defined beside the skill rather than in `#types` because the harness service
 * it needs carries the session runtime, which the UI must not load.
 */
export const RunTriggers = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.runTriggers'),
    name: 'Run triggers',
    description: "Records the facts of the conversation's latest turn and fires the agent's triggers they match.",
    icon: 'ph--lightning--regular',
  },
  services: [Harness.HarnessService, Database.Service, AiService.AiService],
  input: Schema.Struct({}),
  output: Schema.Struct({
    facts: Schema.Number.annotate({ description: 'Facts recorded from the turn.' }),
    fired: Schema.Array(Schema.String).annotate({ description: 'The ids of the triggers that fired.' }),
    undelivered: Schema.Array(Schema.String).annotate({ description: 'Why a fired notification was not delivered.' }),
  }),
});

const operations = [
  MemoryOperation.ResolveEntity,
  MemoryOperation.Recall,
  TriggerOperation.WatchFacts,
  TriggerOperation.ListTriggers,
  TriggerOperation.CancelTrigger,
  MemoryOperation.ConfirmGoal,
];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.agentGoals';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Goals',
    description: 'Waits for outcomes people want ("let me know when X") and tells them when the facts say it happened.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        People may ask you to wait for something: "let me know when Dima's PR is up", "tell me once Josiah agrees".
        You do not know yet, so do not answer from what you already know and do not notify anyone now:
        watch for it, and you will be told when the conversation's facts say it happened.

        When someone wants to be told when something happens (they want an outcome):
        1. Call ${tool(MemoryOperation.ResolveEntity)} for the requester (the person speaking) and for anyone the outcome is about.
        2. Call ${tool(TriggerOperation.WatchFacts)} with the agent you run as, the requester, the request in the
           requester's words ("let me know when Dima's PR is up"), the outcome as a short
           statement ("Dima's indexer PR is up"), the message to send them when it happens (written to them, e.g.
           "Dima's indexer PR is up."), and a pattern for the fact that would show it:
           - speaker: who would say it (the person it is about), when someone in particular would;
           - about: the few words the fact must mention ("indexer PR"); avoid verbs, which people phrase differently;
           - force "assertive" for something that happened or is so, "commissive" for an agreement or promise;
           - polarity "+" for it happening or being agreed, "-" for a refusal or denial.
           The watch records the outcome as a goal the requester owns.
        3. Reply in one short sentence that you will let them know.

        "Keep me posted", "let me know what Dima is up to" and "tell me if anything changes on X" are ongoing, not
        one outcome. First call ${tool(MemoryOperation.Recall)} for the person or topic and tell the requester the
        latest you already know (with who said it and when), since earlier updates will not be forwarded; then call ${tool(TriggerOperation.WatchFacts)} with ongoing true, the request in their words ("what is Dima
        working on? keep me posted"), an outcome such as "Josiah is kept
        posted on Dima's work", a broad pattern (speaker or subject = the person; about only when they named a topic,
        and then the topic, not the one result you expect), and a message with the {fact} placeholder, e.g.
        "Update on Dima: {fact}". Never narrow "keep me posted" to a single event such as a fix landing.

        Conditional instructions are watches too: "if he doesn't agree, tell him it's the priority" is a watch for the
        recipient declining (commissive, polarity "-") with the message to send then and the recipient to send it to.
        Never send a conditional message before its condition holds.

        Call ${tool(TriggerOperation.ListTriggers)} when asked what you are waiting for, and
        ${tool(TriggerOperation.CancelTrigger)} when the requester no longer needs it (dropGoal when they gave up on
        the outcome). When a requester tells you the outcome happened some other way, cancel the watch and call
        ${tool(MemoryOperation.ConfirmGoal)} with status "achieved". Do not narrate tool calls.

        When you pass something on (a notification, or anything you tell someone about another conversation):
        ${RELAY_RULES}
      `,
    }),
    // Fires after every turn: the turn's facts are recorded first, so a trigger sees what was just said.
    hooks: [{ spec: { _tag: 'end-request' }, function: Ref.make(Operation.serialize(RunTriggers)) }],
  });
