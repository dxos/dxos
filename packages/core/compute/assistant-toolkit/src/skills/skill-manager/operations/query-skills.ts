//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Filter, Registry } from '@dxos/echo';

import {
  brief,
  enabledSkills,
  isEnabled,
  knownSkills,
  listedSkill,
  operationCandidates,
  ranked,
  sameKey,
  skillKey,
} from './catalog.ts';
import { QuerySkills } from './definitions.ts';

export default QuerySkills.pipe(
  Operation.withHandler(
    // The skill's own prompt template invokes this with no input at all.
    Effect.fnUntraced(function* ({ query, keys } = {}) {
      const enabled = yield* enabledSkills;
      const skills = knownSkills(yield* Registry.runQuery(Filter.type(Skill.Skill)), enabled);
      if (keys === undefined) {
        // Tool names count: a model that lacks an operation knows what it wants to do, not which skill carries it.
        return ranked(skills, query, (skill) => [skillKey(skill), skill.name, skill.description, ...skill.tools]).map(
          (skill) => listedSkill(skill, isEnabled(enabled, skill)),
        );
      }
      const records = yield* Registry.runQuery(Filter.type(Operation.PersistentOperation));
      return yield* Effect.forEach(
        skills.filter((skill) => keys.some((key) => sameKey(key, skillKey(skill)))),
        Effect.fnUntraced(function* (skill) {
          // A template that fails to render, by an error or a defect, costs the skill its instructions rather than the
          // whole lookup; an interruption still interrupts.
          const instructions = yield* Template.processTemplate(skill.instructions).pipe(
            Effect.map(Option.some),
            Effect.catchCause((cause) =>
              Cause.hasInterrupts(cause) ? Effect.interrupt : Effect.succeed(Option.none<string>()),
            ),
          );
          return {
            ...listedSkill(skill, isEnabled(enabled, skill)),
            ...(Option.isSome(instructions) ? { instructions: instructions.value } : {}),
            operations: operationCandidates([skill], enabled, records).map(({ listed }) => brief(listed)),
          };
        }),
      );
    }),
  ),
);
