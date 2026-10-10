//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { HasSubject } from '@dxos/types';

import { FactEntry, Goal, Memory, MemoryOperation, Profile } from '#types';

import { queryFacts } from './annotations.ts';
import { knowledgeElsewhere } from './presence.ts';

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

/** The ids of the entities sharing a name with the subject: the same person or organization, in another space. */
const sameNamed = (entities: readonly Obj.Unknown[], ids: ReadonlySet<string>): Set<string> =>
  new Set(entities.filter((candidate) => [...entityIds(candidate)].some((id) => ids.has(id))).map(({ id }) => id));

const handler: Operation.WithHandler<typeof MemoryOperation.Recall> = MemoryOperation.Recall.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, query, limit }) {
      const entity = subject ? yield* Database.load(subject) : undefined;
      const ids = entity ? entityIds(entity) : undefined;
      const local = entity
        ? (yield* Database.query(Query.select(Filter.id(entity.id)).targetOf(HasSubject.HasSubject)).run)
            .map((relation) => Relation.getSource(relation))
            .filter(Obj.instanceOf(Memory.Memory))
        : yield* Database.query(Filter.type(Memory.Memory)).run;

      // The agents here remember the other spaces they are in. There the subject is another object, so it is
      // matched by name, as facts are.
      const elsewhere = yield* knowledgeElsewhere(yield* Database.query(Filter.type(Agent.Agent)).run);
      const remote = elsewhere.map(({ memories, goals, entities }) => {
        const subjects = ids && sameNamed(entities, ids);
        return {
          memories: memories
            .filter((entry) => !subjects || entry.subjects.some((id) => subjects.has(id)))
            .map(({ memory }) => memory),
          goals: goals.filter(
            (goal) => !subjects || goal.owners.some((owner) => [...subjects].some((id) => Profile.refersTo(owner, id))),
          ),
        };
      });
      const candidates = [...local, ...remote.flatMap(({ memories }) => memories)];

      const needle = query?.trim().toLowerCase();
      const memories = candidates
        .filter((memory) => memory.status === 'active')
        .filter((memory) => !needle || memory.content.toLowerCase().includes(needle))
        .sort(Profile.byNewest)
        .slice(0, limit ?? undefined);

      // Expired facts stay in the feed as history; recall leaves them out.
      const now = new Date().toISOString();
      const facts = [...(yield* queryFacts), ...elsewhere.flatMap(({ facts }) => facts)]
        .filter(({ fact }) => !fact.assertion.validTo || fact.assertion.validTo > now)
        .filter(({ fact }) => {
          if (!ids) {
            return true;
          }
          const { subject, object } = fact.assertion;
          const entities = [subject, object].flatMap((term) => (term.kind === 'entity' ? [term.entity] : []));
          return [...entities, fact.attribution.agent].some((id) => id !== undefined && ids.has(id));
        })
        .filter(
          ({ fact }) =>
            !needle || `${FactEntry.factText(fact)} ${fact.assertion.quote ?? ''}`.toLowerCase().includes(needle),
        )
        .sort((left, right) =>
          right.fact.attribution.generatedAtTime.localeCompare(left.fact.attribution.generatedAtTime),
        )
        .slice(0, limit ?? undefined);

      const goals = [
        ...(yield* Database.query(Filter.type(Goal.Goal)).run)
          .filter(Profile.isLiveGoal)
          .filter((goal) => !entity || goal.owners.some((owner) => Profile.refersTo(owner, entity.id))),
        ...remote.flatMap(({ goals }) => goals),
      ];

      return {
        memories: memories.map((memory) => ({
          memory: Ref.make(memory),
          content: memory.content,
          kind: memory.kind,
          origin: memory.origin,
          observedAt: memory.observedAt,
        })),
        facts: facts.map(({ pass, fact }) => ({
          fact: FactEntry.factText(fact),
          ...(fact.assertion.quote ? { quote: fact.assertion.quote } : {}),
          ...(fact.attribution.agent ? { speaker: fact.attribution.agent } : {}),
          source: fact.attribution.source,
          ...(pass.name ? { sourceName: pass.name } : {}),
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
