//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { Goal, Memory, Profile } from '#types';

import { type AgentKnowledgeEdge, type AgentKnowledgeNode } from '../AgentKnowledge/index.ts';

export const NOW = new Date('2026-10-03T12:00:00Z');

const AGENT_ID = 'agent';

export type Knowledge = {
  people: Person.Person[];
  organizations: Organization.Organization[];
  goals: Goal.Goal[];
  /** Each memory with the ids of the entities it is about. */
  memories: { memory: Memory.Memory; subjects: string[] }[];
};

/** The graph the container derives from the same objects: the agent knows every entity. */
export const toGraph = ({ people, organizations, goals, memories }: Knowledge) => {
  const entities = [...people, ...organizations];
  if (entities.length + goals.length + memories.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: AgentKnowledgeNode[] = [
    { id: AGENT_ID, label: 'Interlocutor' },
    ...entities.map((entity) => ({ id: entity.id, label: Profile.displayName(entity), object: entity })),
    ...goals.map((goal) => ({ id: goal.id, label: goal.title, object: goal })),
    ...memories.map(({ memory }) => ({ id: memory.id, label: memory.content, object: memory })),
  ];
  const edges: AgentKnowledgeEdge[] = [
    ...entities.map((entity): AgentKnowledgeEdge => ({ source: AGENT_ID, target: entity.id, kind: 'knows' })),
    ...goals.flatMap((goal) =>
      entities
        .filter((entity) => goal.owners.some((owner) => Profile.refersTo(owner, entity.id)))
        .map((entity): AgentKnowledgeEdge => ({ source: goal.id, target: entity.id, kind: 'owner' })),
    ),
    ...memories.flatMap(({ memory, subjects }) =>
      subjects.map((subject): AgentKnowledgeEdge => ({ source: memory.id, target: subject, kind: 'subject' })),
    ),
  ];
  return { nodes, edges };
};

const makeKnowledge = (): Knowledge => {
  const rich = Person.make({ fullName: 'Rich Burdon' });
  const dxos = Organization.make({ name: 'DXOS' });
  const memory = (content: string, kind: Memory.Kind, observedAt: string, subjects: string[]) => ({
    memory: Memory.make({ content, kind, observedAt }),
    subjects,
  });
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
    memories: [
      memory('The Discord bot on EDGE is blocking the interlocutor demo.', 'fact', '2026-10-03T11:50:00Z', [rich.id]),
      memory('Rich wants to hire two engineers this quarter.', 'goal', '2026-10-03T11:40:00Z', [rich.id, dxos.id]),
      memory('Rich leads the Composer team at DXOS.', 'relationship', '2026-10-02T09:00:00Z', [rich.id, dxos.id]),
    ],
  };
};

/** A bigger network of people and organizations, for checking the layout at scale. */
const makeLargeKnowledge = (): Knowledge => {
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
  const memories = people.flatMap((person, index) =>
    [0, 1].map((offset) => ({
      memory: Memory.make({
        content: `Memory ${index * 2 + offset + 1} about ${person.fullName}.`,
        kind: offset === 0 ? 'fact' : 'preference',
        observedAt: new Date(NOW.getTime() - (index * 2 + offset) * 3_600_000).toISOString(),
      }),
      subjects: [person.id, organizations[index % organizations.length].id],
    })),
  );
  return { people, organizations, goals, memories };
};

export const SCENARIOS = {
  default: makeKnowledge,
  empty: (): Knowledge => ({ people: [], organizations: [], goals: [], memories: [] }),
  large: makeLargeKnowledge,
};
