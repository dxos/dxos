//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { Goal, type Knowledge, Profile } from '#types';

import { type AgentKnowledgeEdge, type AgentKnowledgeNode } from '../AgentKnowledge/index.ts';

export const NOW = new Date('2026-10-03T12:00:00Z');

const AGENT_ID = 'agent';

export type Scenario = {
  people: Person.Person[];
  organizations: Organization.Organization[];
  goals: Goal.Goal[];
  /** Each memory with the ids of the entities it is about. */
  memories: { memory: Knowledge.Memory; subjects: string[] }[];
};

let memoryCount = 0;

/** A memory as the brain reads it back. */
const makeMemory = (
  content: string,
  kind: Knowledge.Kind,
  observedAt: string,
  subjects: string[],
): Knowledge.Memory => ({
  id: `https://dxos.org/semantic/graph/memory-${++memoryCount}`,
  content,
  kind,
  origin: 'stated',
  observedAt,
  status: 'active',
  subjects,
});

/** The graph the container derives from the same objects: the agent knows every entity. */
export const toGraph = ({ people, organizations, goals, memories }: Scenario) => {
  const entities = [...people, ...organizations];
  if (entities.length + goals.length + memories.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: AgentKnowledgeNode[] = [
    { id: AGENT_ID, label: 'Interlocutor' },
    ...entities.map((entity) => ({ id: entity.id, label: Profile.displayName(entity), object: entity })),
    ...goals.map((goal) => ({ id: goal.id, label: goal.title, object: goal })),
    ...memories.map(({ memory }) => ({ id: memory.id, label: memory.content })),
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

const makeKnowledge = (): Scenario => {
  const rich = Person.make({ fullName: 'Rich Burdon' });
  const dxos = Organization.make({ name: 'DXOS' });
  const memory = (content: string, kind: Knowledge.Kind, observedAt: string, subjects: string[]) => ({
    memory: makeMemory(content, kind, observedAt, subjects),
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
  const memories = people.flatMap((person, index) =>
    [0, 1].map((offset) => {
      const subjects = [person.id, organizations[index % organizations.length].id];
      return {
        memory: makeMemory(
          `Memory ${index * 2 + offset + 1} about ${person.fullName}.`,
          offset === 0 ? 'fact' : 'preference',
          new Date(NOW.getTime() - (index * 2 + offset) * 3_600_000).toISOString(),
          subjects,
        ),
        subjects,
      };
    }),
  );
  return { people, organizations, goals, memories };
};

export const SCENARIOS = {
  default: makeKnowledge,
  empty: (): Scenario => ({ people: [], organizations: [], goals: [], memories: [] }),
  large: makeLargeKnowledge,
};
