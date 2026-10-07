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

import { BrainService, MemoryOperation } from '#types';

/**
 * The skill's end-request hook: reads the turn's new messages into facts, adds them to the agent's
 * brain, then fires the triggers they match. Defined beside the skill rather than in `#types` because
 * the harness service it needs carries the session runtime, which the UI must not load.
 */
export const RunTriggers = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.runTriggers'),
    name: 'Run triggers',
    description: "Records the facts of the conversation's latest turn and fires the agent's triggers they match.",
    icon: 'ph--lightning--regular',
  },
  services: [Harness.HarnessService, Database.Service, AiService.AiService, BrainService.BrainService],
  input: Schema.Struct({}),
  output: Schema.Struct({
    facts: Schema.Number.annotate({ description: 'Facts recorded from the turn.' }),
    fired: Schema.Array(Schema.String).annotate({ description: 'The ids of the triggers that fired.' }),
    undelivered: Schema.Array(Schema.String).annotate({ description: 'Why a fired notification was not delivered.' }),
  }),
});

const operations = [MemoryOperation.Recall];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.agentBrain';

/** Header of a prompt the brain woke this chat with; the prompt is the agent's own, never a person's. */
export const WAKE_HEADER = '[Update to pass on]';

const WAKE_SEPARATOR = ', from another of your conversations: ';

/** The prompt that wakes a person's chat to give them `text`. */
export const wakePrompt = (recipient: string, text: string): string =>
  `${WAKE_HEADER} For ${recipient}${WAKE_SEPARATOR}${text}`;

/** The text a {@link wakePrompt} carries, or `undefined` for any other prompt; scripted models answer with it. */
export const wakeText = (prompt: string): string | undefined => {
  const start = prompt.indexOf(WAKE_HEADER);
  const separator = start < 0 ? -1 : prompt.indexOf(WAKE_SEPARATOR, start);
  return separator < 0 ? undefined : prompt.slice(separator + WAKE_SEPARATOR.length);
};

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Brain',
    description:
      'Remembers what is said in every conversation as facts, and wakes the right conversation when a fact answers what someone asked to be told.',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You keep one memory across every conversation you are in. After each turn, what people said is
        recorded as facts; call ${tool(MemoryOperation.Recall)} when you need what someone said elsewhere.

        A message starting with "${WAKE_HEADER}" is not from the person you are talking to: you sent it to
        yourself because something they asked to hear about happened in another conversation. Tell them now,
        directly and briefly, in your own words, naming who said it. Do not call any tools for it and do not
        mention the header.
      `,
    }),
    // Fires after every turn: the turn's facts are recorded first, so a trigger sees what was just said.
    hooks: [{ spec: { _tag: 'end-request' }, function: Ref.make(Operation.serialize(RunTriggers)) }],
  });
