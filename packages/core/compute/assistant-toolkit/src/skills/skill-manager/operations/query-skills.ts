//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Registry } from '@dxos/echo';

import { QuerySkills } from './definitions.ts';

export default QuerySkills.pipe(
  Operation.withHandler(
    // The skill's own prompt template invokes this with no input at all.
    Effect.fnUntraced(function* ({ query } = {}) {
      const skills = yield* Registry.runQuery(Filter.type(Skill.Skill));
      const sorted = skills.slice().sort(({ name: a }, { name: b }) => a.localeCompare(b));
      return query === undefined || words(query).length === 0 ? sorted : search(sorted, words(query));
    }),
  ),
);

/**
 * The skills any of `terms` matches, most matched terms first. Tool names count: a model that lacks
 * an operation knows what it wants to do, not which skill carries it.
 */
const search = (skills: readonly Skill.Skill[], terms: readonly string[]): Skill.Skill[] =>
  skills
    .map((skill) => {
      const text = words([Obj.getMeta(skill).key ?? '', skill.name, skill.description ?? '', ...skill.tools].join(' '));
      return { skill, score: terms.filter((term) => text.some((word) => word.startsWith(term))).length };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ skill }) => skill);

/** Lower-case words, splitting kebab-case, dotted keys and camelCase; words under three letters say nothing. */
const words = (text: string): string[] =>
  text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
