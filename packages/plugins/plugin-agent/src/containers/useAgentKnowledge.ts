//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import { type Database, Filter, Obj, type Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { RDF } from '@dxos/pipeline-rdf';
import { Organization, Person } from '@dxos/types';

import {
  type AgentKnowledgeBrainStatus,
  type AgentKnowledgeEdge,
  type AgentKnowledgeFact,
  type AgentKnowledgeGoal,
  type AgentKnowledgeNode,
  type EntityCardModel,
  toEntityCards,
  type AgentKnowledgePredicate,
  curie,
} from '#components';
import { Goal, Knowledge, Profile } from '#types';

import { useBrainStore } from './useBrainStore.ts';
import { useTriggers } from './useTriggers.ts';

/** Live goals first, then the ones that ran their course. */
const GOAL_ORDER: readonly Goal.Status[] = ['active', 'confirmed', 'proposed', 'achieved', 'dropped'];

export type AgentKnowledgeData = {
  memories: Knowledge.Memory[];
  facts: AgentKnowledgeFact[];
  /** One card per entity the brain's facts and active memories mention. */
  cards: EntityCardModel[];
  predicates: AgentKnowledgePredicate[];
  /** The brain's ontology graph as TriG. */
  ontology: string;
  goals: AgentKnowledgeGoal[];
  nodes: AgentKnowledgeNode[];
  edges: AgentKnowledgeEdge[];
  brain: AgentKnowledgeBrainStatus;
  /** Re-reads the brain now, e.g. after changing it. */
  refresh: () => void;
};

/** The name of a fact's source when it is an object in the space (a document); a chat message is a feed item, so has none. */
const sourceName = (db: Database.Database | undefined, uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  const id = eid && EID.getEntityId(eid);
  const object = id ? db?.getObjectById(id) : undefined;
  return object && Obj.getLabel(object);
};

/** What the agent knows, derived for display: its active memories, the facts it read, its goals and its knowledge graph. */
export const useAgentKnowledge = (agent: Agent.Agent): AgentKnowledgeData => {
  const db = Obj.getDatabase(agent);
  const [name] = useObject(agent, 'name');

  const goals = useQuery(db, Filter.type(Goal.Goal));
  const people = useQuery(db, Filter.type(Person.Person));
  const organizations = useQuery(db, Filter.type(Organization.Organization));
  const triggers = useTriggers(agent);

  // Facts and memories live only in the agent's brain (EDGE's for an agent whose chats run there), never in the space.
  const { inspection, error, refresh } = useBrainStore(agent);
  const memories = useMemo(
    () =>
      Knowledge.fromFacts((inspection?.facts ?? []).map(({ fact }) => fact))
        .filter((memory) => memory.status === 'active')
        .sort(Knowledge.byNewest),
    [inspection],
  );

  // A query re-emits on membership only, so status and title changes need per-object subscriptions.
  const graphAtom = useMemo(
    () =>
      Atom.make((get) => {
        goals.forEach((goal) => get(Obj.atom(goal)));
        people.forEach((person) => get(Obj.atom(person)));
        organizations.forEach((organization) => get(Obj.atom(organization)));

        const active = memories;
        const liveGoals = goals.filter(Profile.isLiveGoal);
        const entities = [...people, ...organizations];
        const nodes: AgentKnowledgeNode[] =
          entities.length + liveGoals.length + active.length === 0
            ? []
            : [
                { id: agent.id, label: name || 'Agent', object: agent },
                ...entities.map((entity) => ({ id: entity.id, label: Profile.displayName(entity), object: entity })),
                ...liveGoals.map((goal) => ({ id: goal.id, label: goal.title, object: goal })),
                ...active.map((memory) => ({ id: memory.id, label: memory.content })),
              ];
        const edges: AgentKnowledgeEdge[] = [
          ...entities.map((entity): AgentKnowledgeEdge => ({ source: agent.id, target: entity.id, kind: 'knows' })),
          ...liveGoals.flatMap((goal) =>
            entities
              .filter((entity) => goal.owners.some((owner) => Profile.refersTo(owner, entity.id)))
              .map((entity): AgentKnowledgeEdge => ({ source: goal.id, target: entity.id, kind: 'owner' })),
          ),
          ...active.flatMap((memory) =>
            memory.subjects.flatMap((subject): AgentKnowledgeEdge[] => {
              const uri = EID.tryParse(subject);
              const target = uri && EID.getEntityId(uri);
              return target ? [{ source: memory.id, target, kind: 'subject' }] : [];
            }),
          ),
        ];

        const nameOf = (ref: Ref.Unknown): string | undefined => {
          const entity = entities.find((entity) => Profile.refersTo(ref, entity.id));
          return entity && Profile.displayName(entity);
        };
        const goalItems: AgentKnowledgeGoal[] = [...goals]
          .sort((left, right) => GOAL_ORDER.indexOf(left.status) - GOAL_ORDER.indexOf(right.status))
          .map((goal) => ({
            id: goal.id,
            title: goal.title,
            status: goal.status,
            owners:
              goal.owners
                .map(nameOf)
                .filter((owner) => owner !== undefined)
                .join(', ') || undefined,
            watches: triggers
              .filter((trigger) => trigger.goal && Profile.refersTo(trigger.goal, goal.id))
              .map(({ id, when, recipient, message }) => ({ id, when, recipient: nameOf(recipient), message })),
          }));

        return { nodes, edges, goals: goalItems };
      }),
    [agent, name, memories, goals, people, organizations, triggers],
  );
  const { nodes, edges, goals: goalItems } = useAtomValue(graphAtom);

  // A memory's statements are listed as the memory, not again as facts.
  const facts = useMemo(
    () =>
      (inspection?.facts ?? [])
        .filter(({ fact }) => fact.kind === undefined)
        .map(({ id, text, speaker, saidAt, fact }): AgentKnowledgeFact => ({
          id,
          text,
          speaker,
          saidAt,
          source: sourceName(db, fact.attribution.source),
          fact,
        })),
    [inspection, db],
  );

  // Retracted and replaced memories drop out, as they do from Memories; a retraction marker states nothing itself.
  const cards = useMemo(() => {
    const active = new Set(memories.map((memory) => memory.id));
    const statements = (inspection?.facts ?? [])
      .map(({ fact }) => fact)
      .filter(
        (fact) =>
          fact.kind === undefined || (fact.graph !== undefined && active.has(fact.graph) && !fact.retracts?.length),
      );
    return toEntityCards(statements, { objects: true });
  }, [inspection, memories]);

  // The brain starts with the seed vocabulary; the predicates its extractor minted are read off the facts that use
  // them, which carry the definition the brain stored.
  const { predicates, ontology } = useMemo(() => {
    const all = (inspection?.facts ?? []).map(({ fact }) => fact);
    const seeded = RDF.Ontology.DEFAULT.withNamespace(RDF.Vocab.brainNamespace(agent.id));
    const known = seeded.include(RDF.Graph.mintedPredicates(all, seeded));
    const counts = new Map<string, number>();
    for (const fact of all) {
      const iri = RDF.Mapping.predicateOf(fact, known);
      const canonical = known.canonical(iri)?.iri ?? iri;
      counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
    }
    const items = known.entries
      .map((entry): AgentKnowledgePredicate => {
        const name = curie(entry.iri, known.namespace);
        return {
          iri: entry.iri,
          curie: name,
          label: entry.label,
          vocabulary: entry.definedBy === known.namespace ? 'brain' : name.split(':')[0],
          ...(entry.description ? { description: entry.description } : {}),
          ...(entry.synonyms?.length ? { synonyms: entry.synonyms } : {}),
          count: counts.get(entry.iri) ?? 0,
        };
      })
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
    return { predicates: items, ontology: RDF.Graph.ontologyToTriG(known) };
  }, [inspection, agent.id]);

  // A failed re-read keeps the last snapshot on screen, so an error stands in only before anything was read.
  const brain = useMemo(
    (): AgentKnowledgeBrainStatus =>
      inspection ? { state: 'ready' } : error ? { state: 'error', error } : { state: 'loading' },
    [inspection, error],
  );

  return { memories, facts, cards, predicates, ontology, goals: goalItems, nodes, edges, brain, refresh };
};
