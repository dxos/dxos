//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import { describeInput } from '@dxos/assistant/Describe';
import * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import { Obj } from '@dxos/echo';

import type { ListedOperation, ListedSkill } from './definitions.ts';

/** The skills enabled in this conversation, or none where it has no binder. */
export const enabledSkills: Effect.Effect<Skill.Skill[], never, Harness.HarnessService> = Harness.binder.pipe(
  Effect.tap((binder) => Effect.promise(() => binder.sync())),
  Effect.map((binder) => binder.getSkills()),
  Effect.orElseSucceed((): Skill.Skill[] => []),
);

/** A skill's key, or for a space-authored skill with none its URI. */
export const skillKey = (skill: Skill.Skill): string => Obj.getMeta(skill).key ?? String(Obj.getURI(skill));

/** Keys compare with or without the `dxn:` prefix, which records and definitions spell differently. */
export const sameKey = (left: string, right: string): boolean => bare(left) === bare(right);
const bare = (key: string): string => key.replace(/^dxn:/, '');

/** Whether `skill` is one of `enabled`. */
export const isEnabled = (enabled: readonly Skill.Skill[], skill: Skill.Skill): boolean =>
  enabled.some((other) => sameKey(skillKey(other), skillKey(skill)));

/** The registry's skills and any enabled one it does not hold (a space-authored skill), by name. */
export const knownSkills = (registered: readonly Skill.Skill[], enabled: readonly Skill.Skill[]): Skill.Skill[] =>
  [...registered, ...enabled.filter((skill) => !isEnabled(registered, skill))].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

export const listedSkill = (skill: Skill.Skill, enabled: boolean): ListedSkill => ({
  key: skillKey(skill),
  name: skill.name,
  ...(skill.description === undefined ? {} : { description: String(skill.description) }),
  enabled,
  agentCanEnable: skill.agentCanEnable === true,
});

/** A listed operation, with the record it describes. */
export type OperationCandidate = { readonly listed: ListedOperation; readonly record: Operation.PersistentOperation };

/**
 * The operations of `skills`, each once, read from the registry's records (which every host's tools resolve through).
 * Enabled skills' come first, so an operation two skills share counts as enabled when either is.
 */
export const operationCandidates = (
  skills: readonly Skill.Skill[],
  enabled: readonly Skill.Skill[],
  records: readonly Operation.PersistentOperation[],
): OperationCandidate[] => {
  const byTool = new Map(
    records.flatMap((record) => {
      const key = Operation.getKey(record);
      const tool = key === undefined ? undefined : Operation.tryToolNameFromKey(key);
      return key === undefined || tool === undefined ? [] : [[tool, { key, record }] as const];
    }),
  );
  const ordered = [...skills].sort(
    (left, right) => Number(isEnabled(enabled, right)) - Number(isEnabled(enabled, left)),
  );
  const candidates = new Map<string, OperationCandidate>();
  for (const skill of ordered) {
    for (const tool of skill.tools) {
      const found = byTool.get(String(tool));
      if (found !== undefined && !candidates.has(bare(found.key))) {
        candidates.set(bare(found.key), {
          listed: {
            key: found.key,
            tool: String(tool),
            name: found.record.name,
            ...(found.record.description === undefined ? {} : { description: found.record.description }),
            skill: skillKey(skill),
            enabled: isEnabled(enabled, skill),
          },
          record: found.record,
        });
      }
    }
  }
  return [...candidates.values()];
};

/**
 * The listed operation with its input, labelled as code passes it (refs as `Ref<typename>`). Left out where the record's
 * schema cannot be rebuilt, which costs only that operation's input.
 */
export const withInput = ({ listed, record }: OperationCandidate): Effect.Effect<ListedOperation> =>
  Effect.try(() => describeInput(Operation.deserialize(record).input)).pipe(
    Effect.map((input) => ({ ...listed, input })),
    Effect.orElseSucceed(() => listed),
  );

/** Lower-case words, splitting dotted keys, kebab-case and camelCase; words under three letters say nothing. */
const words = (text: string): string[] =>
  text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);

/** The items any of the query's words match, most matched first; every item, in order, without a query. */
export const ranked = <T>(
  items: readonly T[],
  query: string | undefined,
  text: (item: T) => readonly (string | undefined)[],
): T[] => {
  const terms = words(query ?? '');
  if (terms.length === 0) {
    return [...items];
  }
  return items
    .map((item) => {
      const itemWords = words(
        text(item)
          .filter((part) => part !== undefined)
          .join(' '),
      );
      return { item, score: terms.filter((term) => itemWords.some((word) => word.startsWith(term))).length };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);
};

/** An operation as a list shows it: its description cut to the first sentence, which a lookup by key gives in full. */
export const brief = (listed: ListedOperation): ListedOperation =>
  listed.description === undefined
    ? listed
    : {
        ...listed,
        description: (/^.*?[.!?](?=\s|$)/s.exec(listed.description)?.[0] ?? listed.description).slice(0, 200),
      };
