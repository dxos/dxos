//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
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
  withInput,
} from './catalog.ts';
import { QueryOperations } from './definitions.ts';

export default QueryOperations.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ query, skill, keys } = {}) {
      const enabled = yield* enabledSkills;
      // The skills the agent can use: enabled here, or ones it may enable.
      const skills = knownSkills(yield* Registry.runQuery(Filter.type(Skill.Skill)), enabled).filter(
        (candidate) =>
          (isEnabled(enabled, candidate) || candidate.agentCanEnable === true) &&
          (skill === undefined || sameKey(skill, skillKey(candidate))),
      );
      const candidates = operationCandidates(
        skills,
        enabled,
        yield* Registry.runQuery(Filter.type(Operation.PersistentOperation)),
      );
      if (keys !== undefined) {
        return candidates
          .filter(({ listed }) => keys.some((key) => sameKey(key, listed.key) || key === listed.tool))
          .map(withInput);
      }
      return ranked(candidates, query, ({ listed }) => [listed.key, listed.name, listed.description, listed.skill]).map(
        ({ listed }) => brief(listed),
      );
    }),
  ),
);
