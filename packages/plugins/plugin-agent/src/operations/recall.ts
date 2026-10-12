//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { type RDF } from '@dxos/pipeline-rdf';
import { HasSubject } from '@dxos/types';

import { BrainService, Goal, Memory, MemoryOperation, Profile } from '#types';

import { personDid } from './members.ts';

/** pipeline-rdf's entity id for a surface form (`normalizeEntityId`), restated to keep its query engine out of this module. */
const slug = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** The entity ids a fact about the subject may use: a person's member id, and its names for facts no roster resolved. */
const entityIds = (entity: Obj.Unknown): Set<string> => {
  const name = (field: string): string | undefined => {
    const value = Reflect.get(entity, field);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };
  const fullName = name('fullName');
  const names = [fullName, fullName?.split(/\s+/)[0], name('preferredName'), name('nickname'), name('name')]
    .filter((value) => value !== undefined)
    .map(slug)
    .filter((value) => value.length > 0);
  const did = personDid(entity);
  return new Set(did ? [did, ...names] : names);
};

/** Every fact in the brains of the space's agents, each once: two agents reading one document store the same facts. */
const spaceFacts = Effect.gen(function* () {
  const brain = yield* BrainService.BrainService;
  const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
  const facts = yield* Effect.forEach(agents, (agent) => brain.query(agent.id, {}));
  return [...new Map(facts.flat().map((fact) => [fact.id, fact])).values()];
});

/** The names of the facts' sources that are objects in the space (documents); a chat message is a feed item, so has none. */
const sourceNames = Effect.fnUntraced(function* (facts: readonly RDF.Fact[]) {
  const names = new Map<string, string>();
  for (const uri of new Set(facts.map(({ attribution }) => attribution.source))) {
    const eid = EID.tryParse(uri);
    const id = eid && EID.getEntityId(eid);
    const [object] = id ? yield* Database.query(Filter.id(id)).run : [];
    const label = object && Obj.getLabel(object);
    if (label) {
      names.set(uri, label);
    }
  }
  return names;
});

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

      // Expired facts stay in the brain as history; recall leaves them out.
      const now = new Date().toISOString();
      const ids = entity ? entityIds(entity) : undefined;
      const facts = (yield* spaceFacts)
        .filter((fact) => !fact.assertion.validTo || fact.assertion.validTo > now)
        .filter((fact) => {
          if (!ids) {
            return true;
          }
          const { subject, object } = fact.assertion;
          const entities = [subject, object].flatMap((term) => (term.kind === 'entity' ? [term.entity] : []));
          return [...entities, fact.attribution.agent].some((id) => id !== undefined && ids.has(id));
        })
        .filter(
          (fact) =>
            !needle || `${BrainService.factText(fact)} ${fact.assertion.quote ?? ''}`.toLowerCase().includes(needle),
        )
        .sort((left, right) => right.attribution.generatedAtTime.localeCompare(left.attribution.generatedAtTime))
        .slice(0, limit ?? undefined);
      const names = yield* sourceNames(facts);

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
        facts: facts.map((fact) => ({
          fact: BrainService.factText(fact),
          ...(fact.assertion.quote ? { quote: fact.assertion.quote } : {}),
          ...((fact.attribution.agentLabel ?? fact.attribution.agent)
            ? { speaker: fact.attribution.agentLabel ?? fact.attribution.agent }
            : {}),
          source: fact.attribution.source,
          ...(names.has(fact.attribution.source) ? { sourceName: names.get(fact.attribution.source) } : {}),
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
