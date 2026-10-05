//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { HasSubject } from '@dxos/types';

import { FactEntry, Goal, Memory, MemoryOperation, Profile } from '#types';

import { queryFactEntries } from './annotations.ts';

/** pipeline-rdf's entity id for a surface form (`normalizeEntityId`), restated to keep its query engine out of this module. */
const slug = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** The entity ids a fact about the subject may use: its names and a person's first name. */
const entityIds = (entity: Obj.Unknown): Set<string> => {
  const name = (field: string): string | undefined => {
    const value = Reflect.get(entity, field);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };
  const fullName = name('fullName');
  return new Set(
    [fullName, fullName?.split(/\s+/)[0], name('preferredName'), name('nickname'), name('name')]
      .filter((value) => value !== undefined)
      .map(slug)
      .filter((value) => value.length > 0),
  );
};

const handler: Operation.WithHandler<typeof MemoryOperation.Recall> = MemoryOperation.Recall.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, query, limit }) {
      const entity = subject ? yield* Database.load(subject) : undefined;
      const candidates = entity
        ? (yield* Database.query(Query.select(Filter.id(entity.id)).targetOf(HasSubject.HasSubject)).run)
            .map((relation) => Relation.getSource(relation))
            .filter(Obj.instanceOf(Memory.Memory))
        : yield* Database.query(Filter.type(Memory.Memory)).run;

      const needle = query?.trim().toLowerCase();
      const memories = candidates
        .filter((memory) => memory.status === 'active')
        .filter((memory) => !needle || memory.content.toLowerCase().includes(needle))
        .sort(Profile.byNewest)
        .slice(0, limit ?? undefined);

      // Expired facts stay in the feed as history; recall leaves them out.
      const now = new Date().toISOString();
      const ids = entity ? entityIds(entity) : undefined;
      const facts = (yield* queryFactEntries)
        .flatMap((entry) => entry.facts.map((fact) => ({ entry, fact })))
        .filter(({ fact }) => !fact.assertion.validTo || fact.assertion.validTo > now)
        .filter(({ fact }) => {
          if (!ids) {
            return true;
          }
          const { subject, object } = fact.assertion;
          return [subject.entity, object.entity, fact.attribution.agent].some((id) => id !== undefined && ids.has(id));
        })
        .filter(
          ({ fact }) =>
            !needle || `${FactEntry.factText(fact)} ${fact.assertion.quote ?? ''}`.toLowerCase().includes(needle),
        )
        .sort((left, right) =>
          right.fact.attribution.generatedAtTime.localeCompare(left.fact.attribution.generatedAtTime),
        )
        .slice(0, limit ?? undefined);

      const goals = (yield* Database.query(Filter.type(Goal.Goal)).run)
        .filter(Profile.isLiveGoal)
        .filter((goal) => !entity || goal.owners.some((owner) => Profile.refersTo(owner, entity.id)));

      return {
        memories: memories.map((memory) => ({
          memory: Ref.make(memory),
          content: memory.content,
          kind: memory.kind,
          origin: memory.origin,
          observedAt: memory.observedAt,
        })),
        facts: facts.map(({ entry, fact }) => ({
          fact: FactEntry.factText(fact),
          ...(fact.assertion.quote ? { quote: fact.assertion.quote } : {}),
          ...(fact.attribution.agent ? { speaker: fact.attribution.agent } : {}),
          source: fact.attribution.source,
          ...(entry.name ? { sourceName: entry.name } : {}),
          saidAt: fact.attribution.generatedAtTime,
        })),
        goals: goals.map((goal) => ({
          goal: Ref.make(goal),
          title: goal.title,
          horizon: goal.horizon,
          status: goal.status,
        })),
      };
    }),
  ),
);

export default handler;
