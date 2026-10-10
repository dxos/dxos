//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { isNonNullable } from '@dxos/util';

import { AgentOperation } from '#types';

import {
  findBound,
  fork,
  loadChats,
  loadCopies,
  openBinder,
  rebind,
  replaceInstructionSkills,
} from './agent-skills.ts';
import { AgentOperationError } from './errors.ts';

const handler: Operation.WithHandler<typeof AgentOperation.CustomizeSkill> = AgentOperation.CustomizeSkill.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent: agentRef, skill: key }) {
      const agent = yield* Database.load(agentRef).pipe(Effect.orDie);
      const binders = yield* Effect.forEach(yield* loadChats(agent), openBinder);

      let copy = (yield* loadCopies(agent, key)).at(0);
      if (!copy) {
        // Forked from what the chats run now: the compiled skill, or a legacy copy carrying earlier edits.
        const source = binders.map((binder) => findBound(binder, key)).find(isNonNullable);
        if (!source) {
          return yield* Effect.fail(new AgentOperationError({ context: { key }, message: 'Skill is not bound.' }));
        }

        copy = yield* Database.add(yield* fork(source, agent));
      }

      const to = Ref.make(copy);
      const replaced = yield* Effect.forEach(binders, (binder) => rebind(binder, key, to));
      yield* replaceInstructionSkills(agent, new Set(replaced.filter(isNonNullable).map((ref) => ref.uri)), to);
      return { skill: to };
    }, Effect.scoped),
  ),
);

export default handler;
