//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { Goal, Profile } from '#types';

import { type AgentKnowledgeEdge, type AgentKnowledgeNode } from '../AgentKnowledge/index.ts';

export const NOW = new Date('2026-10-03T12:00:00Z');

const AGENT_ID = 'agent';

/** A fact relating two of the scenario's entities, by their ids. */
export type Relation = { subject: string; predicate: string; object: string };

export type Scenario = {
  people: Person.Person[];
  organizations: Organization.Organization[];
  goals: Goal.Goal[];
  relations: Relation[];
};

/** The graph the container derives from the same objects: the agent knows every entity. */
export const toGraph = ({ people, organizations, goals, relations }: Scenario) => {
  const entities = [...people, ...organizations];
  if (entities.length + goals.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: AgentKnowledgeNode[] = [
    { id: AGENT_ID, label: 'Interlocutor' },
    ...entities.map((entity) => ({ id: entity.id, label: Profile.displayName(entity), object: entity })),
    ...goals.map((goal) => ({ id: goal.id, label: goal.title, object: goal })),
  ];
  const edges: AgentKnowledgeEdge[] = [
    ...entities.map((entity): AgentKnowledgeEdge => ({ source: AGENT_ID, target: entity.id, kind: 'knows' })),
    ...goals.flatMap((goal) =>
      entities
        .filter((entity) => goal.owners.some((owner) => Profile.refersTo(owner, entity.id)))
        .map((entity): AgentKnowledgeEdge => ({ source: goal.id, target: entity.id, kind: 'owner' })),
    ),
    ...relations.map(({ subject, object }): AgentKnowledgeEdge => ({
      source: subject,
      target: object,
      kind: 'related',
    })),
  ];
  return { nodes, edges };
};

const makeKnowledge = (): Scenario => {
  const rich = Person.make({ fullName: 'Rich Burdon' });
  const dxos = Organization.make({ name: 'DXOS' });
  return {
    people: [rich],
    organizations: [dxos],
    goals: [
      Goal.make({ title: 'Interlocutor demo working end to end', horizon: 'quarter', owners: [Ref.make(rich)] }),
      Goal.make({
        title: 'Hire two engineers',
        horizon: 'quarter',
        status: 'confirmed',
        owners: [Ref.make(rich), Ref.make(dxos)],
      }),
    ],
    relations: [{ subject: rich.id, predicate: 'works for', object: dxos.id }],
  };
};

/** A bigger network of people and organizations, for checking the layout at scale. */
const makeLargeKnowledge = (): Scenario => {
  const organizations = ['DXOS', 'Acme', 'Globex', 'Initech'].map((name) => Organization.make({ name }));
  const people = Array.from({ length: 16 }, (_, index) => Person.make({ fullName: `Person ${index + 1}` }));
  const goals = people
    .filter((_, index) => index % 3 === 0)
    .map((person, index) =>
      Goal.make({
        title: `Goal ${index + 1}`,
        horizon: 'year',
        status: index % 2 === 0 ? 'confirmed' : 'proposed',
        owners: [Ref.make(person)],
      }),
    );
  const relations = people.map((person, index) => ({
    subject: person.id,
    predicate: 'works for',
    object: organizations[index % organizations.length].id,
  }));
  return { people, organizations, goals, relations };
};

export const SCENARIOS = {
  default: makeKnowledge,
  empty: (): Scenario => ({ people: [], organizations: [], goals: [], relations: [] }),
  large: makeLargeKnowledge,
};
