//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Skill } from '@dxos/compute';
import { Filter, Registry } from '@dxos/echo';

import { QuerySkills } from './definitions';

export default QuerySkills.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const skills = yield* Registry.runQuery(Filter.type(Skill.Skill));
      return skills.slice().sort(({ name: a }, { name: b }) => a.localeCompare(b));
    }),
  ),
);
