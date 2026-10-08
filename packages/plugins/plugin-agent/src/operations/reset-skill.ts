//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref } from '@dxos/echo';
import { isNonNullable } from '@dxos/util';

import { AgentOperation } from '#types';

import { loadChats, loadCopies, openBinder, rebind, replaceInstructionSkills } from './agent-skills.ts';

const handler: Operation.WithHandler<typeof AgentOperation.ResetSkill> = AgentOperation.ResetSkill.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, skill: key }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const binders = yield* Effect.forEach(yield* loadChats(agent), openBinder);

      const to: Ref.Ref<Skill.Skill> = Ref.fromURI(Skill.registryURI(key));
      const replaced = yield* Effect.forEach(binders, (binder) => rebind(binder, key, to));
      yield* replaceInstructionSkills(agent, new Set(replaced.filter(isNonNullable).map((ref) => ref.uri)), to);

      // Only the agent's own copies are deleted; a shared or legacy space skill may be bound elsewhere.
      for (const copy of yield* loadCopies(agent, key)) {
        const text = yield* Database.load(copy.instructions.source).pipe(Effect.option);
        yield* Database.remove(copy);
        if (text._tag === 'Some') {
          yield* Database.remove(text.value);
        }
      }

      return {};
    }, Effect.scoped),
  ),
);

export default handler;
