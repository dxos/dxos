//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { type Database, Obj, Ref } from '@dxos/echo';
import { type IdentityDid } from '@dxos/keys';

import { BrainSkill, ConversationSkill, GoalsSkill, ModesSkill, RelaySkill } from '#skills';
import { AgentOperation, Mode } from '#types';

import { baseInstructions } from '../instructions.ts';
import { ensureModes } from './modes.ts';

export type MakeAgentProps = {
  name: string;
  /** Markdown instructions; the base instructions for `name` when omitted. */
  instructions?: string;
  /** The identity the agent attributes its work to; a presence in another space keeps its home's. */
  did?: IdentityDid;
  /** Foreign keys, e.g. the home a presence belongs to. */
  keys?: { source: string; id: string }[];
};

/** An initialized agent in the space: instructions, built-in modes and a first chat in the default mode. */
export const makeAgent = ({
  name,
  instructions,
  did,
  keys,
}: MakeAgentProps): Effect.Effect<Agent.Agent, never, Database.Service> =>
  Effect.gen(function* () {
    // Bound by registry URI so the agent follows the compiled skills until `customizeSkill` forks one.
    // The base skills only: each further skill comes with a mode (see `switchMode`).
    const agent = yield* Agent.makeInitialized(
      {
        name,
        instructions: instructions ?? baseInstructions(name),
        skills: [ModesSkill.key, RelaySkill.key, GoalsSkill.key, BrainSkill.key].map((key) =>
          Ref.fromURI(Skill.registryURI(key)),
        ),
        ...(did ? { did } : {}),
        ...(keys ? { [Obj.Meta]: { keys } } : {}),
      },
      Ref.fromURI(Skill.registryURI(ConversationSkill.key)),
    );
    yield* ensureModes(agent);
    const chat = yield* Agent.loadChat(agent);
    if (chat) {
      Obj.update(chat, (chat) => Mode.setCurrent(chat, Mode.DEFAULT));
    }
    return agent;
  });

const handler: Operation.WithHandler<typeof AgentOperation.CreateAgent> = AgentOperation.CreateAgent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, instructions }) {
      return { agent: Ref.make(yield* makeAgent({ name, instructions })) };
    }),
  ),
);

export default handler;
