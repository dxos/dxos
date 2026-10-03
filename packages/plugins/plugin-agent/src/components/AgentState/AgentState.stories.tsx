//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Ref } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';

import { translations } from '#translations';
import { Goal, Memory, Profile } from '#types';

import {
  AgentState,
  type AgentStateCounts,
  type AgentStateEdge,
  type AgentStateNode,
  type AgentStateSkill,
} from './AgentState.tsx';

const NOW = new Date('2026-10-03T12:00:00Z');

const AGENT_ID = 'agent';

type Knowledge = {
  people: Person.Person[];
  organizations: Organization.Organization[];
  goals: Goal.Goal[];
  /** Each memory with the ids of the entities it is about. */
  memories: { memory: Memory.Memory; subjects: string[] }[];
};

/** The graph the container derives from the same objects: the agent knows every entity. */
const toGraph = ({ people, organizations, goals, memories }: Knowledge) => {
  const entities = [...people, ...organizations];
  if (entities.length + goals.length + memories.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: AgentStateNode[] = [
    { id: AGENT_ID, label: 'Interlocutor' },
    ...entities.map((entity) => ({ id: entity.id, label: Profile.displayName(entity), object: entity })),
    ...goals.map((goal) => ({ id: goal.id, label: goal.title, object: goal })),
    ...memories.map(({ memory }) => ({ id: memory.id, label: memory.content, object: memory })),
  ];
  const edges: AgentStateEdge[] = [
    ...entities.map((entity): AgentStateEdge => ({ source: AGENT_ID, target: entity.id, kind: 'knows' })),
    ...goals.flatMap((goal) =>
      entities
        .filter((entity) => goal.owners.some((owner) => Profile.refersTo(owner, entity.id)))
        .map((entity): AgentStateEdge => ({ source: goal.id, target: entity.id, kind: 'owner' })),
    ),
    ...memories.flatMap(({ memory, subjects }) =>
      subjects.map((subject): AgentStateEdge => ({ source: memory.id, target: subject, kind: 'subject' })),
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

const SKILLS: AgentStateSkill[] = [
  { key: 'org.dxos.skill.agentConversation', name: 'Agent conversation' },
  { key: 'org.dxos.skill.interview', name: 'Interview' },
];

const countsOf = ({ people, organizations, goals, memories }: Knowledge): AgentStateCounts => ({
  memories: { active: memories.length, expired: 0 },
  goals: {
    proposed: goals.filter((goal) => goal.status === 'proposed').length,
    confirmed: goals.filter((goal) => goal.status === 'confirmed').length,
  },
  people: people.length,
  organizations: organizations.length,
  conversations: 2,
  tasks: { open: 1, total: 3 },
});

type StoryProps = {
  name?: string;
  did?: string;
  skills: AgentStateSkill[];
  /** Named rather than passed as objects, because storybook clones args and ECHO objects reject the writes. */
  scenario: keyof typeof SCENARIOS;
  counts?: AgentStateCounts;
};

const SCENARIOS = {
  default: makeKnowledge,
  empty: (): Knowledge => ({ people: [], organizations: [], goals: [], memories: [] }),
  large: makeLargeKnowledge,
};

const DefaultStory = ({ name, did, skills, scenario, counts }: StoryProps) => {
  const knowledge = useMemo(() => SCENARIOS[scenario](), [scenario]);
  const { nodes, edges } = useMemo(() => toGraph(knowledge), [knowledge]);
  return (
    <AgentState.Root name={name}>
      <AgentState.Identity did={did} skills={skills} />
      <AgentState.Summary counts={counts ?? countsOf(knowledge)} />
      <AgentState.Activity memories={knowledge.memories.map(({ memory }) => memory).slice(0, 5)} now={NOW} />
      <AgentState.Graph nodes={nodes} edges={edges} />
    </AgentState.Root>
  );
};

const meta = {
  title: 'plugins/plugin-agent/components/AgentState',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'Interlocutor',
    did: 'did:halo:9f2c4e1a7b3d5f6e8a0c2b4d6f8e0a1c',
    skills: SKILLS,
    scenario: 'default',
  },
};

export const Empty: Story = {
  args: {
    skills: [],
    scenario: 'empty',
    counts: {
      memories: { active: 0, expired: 0 },
      goals: { proposed: 0, confirmed: 0 },
      people: 0,
      organizations: 0,
      conversations: 0,
    },
  },
};

export const LargeGraph: Story = {
  args: {
    name: 'Interlocutor',
    skills: SKILLS,
    scenario: 'large',
  },
};
