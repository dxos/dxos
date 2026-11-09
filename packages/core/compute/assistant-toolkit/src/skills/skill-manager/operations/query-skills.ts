//
// Copyright 2026 DXOS.org
//

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
  operationCandidates,
  ranked,
  sameKey,
  skillKey,
  skillRow,
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
          (skill) => skillRow(skill, isEnabled(enabled, skill)),
        );
      }
      const records = yield* Registry.runQuery(Filter.type(Operation.PersistentOperation));
      return yield* Effect.forEach(
        skills.filter((skill) => keys.some((key) => sameKey(key, skillKey(skill)))),
        Effect.fnUntraced(function* (skill) {
          // A template that fails to render costs the skill its instructions, not the whole lookup.
          const instructions = yield* Template.processTemplate(skill.instructions).pipe(Effect.option);
          return {
            ...skillRow(skill, isEnabled(enabled, skill)),
            ...(Option.isSome(instructions) ? { instructions: instructions.value } : {}),
            operations: operationCandidates([skill], enabled, records).map(({ row }) => brief(row)),
          };
        }),
      );
    }),
  ),
);
