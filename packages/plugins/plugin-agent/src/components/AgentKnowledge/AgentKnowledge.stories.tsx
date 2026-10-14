//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { type RDF } from '@dxos/pipeline-rdf';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { translations } from '#translations';

import { NOW, SCENARIOS, toGraph } from '../AgentState/testing.ts';
import {
  AgentKnowledge,
  type AgentKnowledgeFact,
  type AgentKnowledgeGoal,
  type AgentKnowledgeView,
} from './AgentKnowledge.tsx';
import { formatNamedGraphs } from './trig.ts';
import { TURTLE_PREFIXES, formatRawFact } from './turtle.ts';

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

/** Facts as `readSource` records them from the CI-triage transcript, newest first. */
const FACTS: AgentKnowledgeFact[] = [
  {
    id: 'f1',
    text: 'Dima owns indexer',
    source: 'CI triage',
    speaker: 'dima',
    saidAt: hoursAgo(2),
    fact: {
      id: 'f1',
      assertion: {
        subject: { kind: 'entity', entity: 'dima', label: 'Dima' },
        predicate: 'owns',
        object: { kind: 'entity', entity: 'indexer' },
        quote: 'I own the indexer',
      },
      factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
      attribution: { agent: 'dima', agentLabel: 'Dima', source: 'dxn:chat/ci-triage', generatedAtTime: hoursAgo(2) },
      recordedAt: hoursAgo(2),
      extractor: { id: 'read-source', model: 'claude-haiku-5-5', version: '1' },
      sourceHash: '3f2a9c',
    },
  },
  { id: 'f2', text: 'race is in v12 index migration', source: 'CI triage', speaker: 'dima', saidAt: hoursAgo(2) },
  { id: 'f3', text: 'Josiah reviews fix', source: 'CI triage', speaker: 'josiah', saidAt: hoursAgo(3) },
  { id: 'f4', text: '0.12 release is on 10 October', source: 'Release notes', saidAt: hoursAgo(26) },
];

/** A goal Rich is waiting on, with the watch that will tell him, and one already achieved. */
const GOALS: AgentKnowledgeGoal[] = [
  {
    id: 'g1',
    title: "Dima's indexer PR is up",
    status: 'active',
    owners: 'Rich',
    watches: [
      {
        id: 't1',
        when: 'Dima · assertive · + · about "indexer PR"',
        recipient: 'Rich',
        message: "Dima's indexer PR is up.",
      },
    ],
  },
  { id: 'g2', title: 'Josiah redeploys the EDGE workers', status: 'achieved', owners: 'Rich', watches: [] },
];

const SPACE = 'BBW5ANOFUMCIHWGKE2W3JFTXJUOATRJKF';

const rdfFact = (
  id: string,
  [subject, predicate, object]: readonly [RDF.Term, string, RDF.Term],
  provenance: Pick<RDF.Fact['assertion'], 'quote'> & { source: string; agent?: string; at: string; hash: string },
): RDF.Fact => ({
  id,
  assertion: { subject, predicate, object, quote: provenance.quote },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: provenance.source, agent: provenance.agent, generatedAtTime: provenance.at },
  recordedAt: provenance.at,
  extractor: { id: 'default', model: 'claude-haiku-5-5', version: '1' },
  sourceHash: provenance.hash,
});

const entity = (id: string, label?: string): RDF.Term => ({ kind: 'entity', entity: id, label });

/** One roster sentence read from the team page (two statements, one provenance) and a line Dima said in CI triage. */
const ROSTER = { source: 'https://dxos.org/team', at: hoursAgo(30), hash: 'e7f0d44f' };
const RDF_FACTS: RDF.Fact[] = [
  rdfFact('team-1', [entity('rich-burdon', 'Rich Burdon'), 'is-a', entity('founder', 'Founder')], {
    ...ROSTER,
    quote: 'Rich Burdon (Rich) is on the DXOS team as Founder',
  }),
  rdfFact('team-2', [entity('rich-burdon', 'Rich Burdon'), 'is member of', entity('dxos', 'DXOS')], {
    ...ROSTER,
    quote: 'Rich Burdon (Rich) is on the DXOS team as Founder',
  }),
  rdfFact('triage-1', [entity('dima', 'Dima'), 'owns', entity('indexer', 'indexer')], {
    source: 'dxn:chat/ci-triage',
    agent: 'dima',
    at: hoursAgo(2),
    hash: '3f2a9c',
    quote: 'I own the indexer',
  }),
];

/** What the extractor could resolve: people and the team to ECHO objects; roles and the indexer stay graph-scoped. */
const RESOLVED = {
  entities: {
    'rich-burdon': `echo://${SPACE}/01M4Q8RICH0000000000000000`,
    'dxos': `echo://${SPACE}/01M4Q8DXOS0000000000000000`,
    'dima': `echo://${SPACE}/01M4Q8DIMA0000000000000000`,
  },
  predicates: { 'is-a': 'hasRole', 'member of': 'memberOf', 'own': 'owns' },
};

const Source = ({ title, children }: { title: string; children: string }) => (
  <Panel.Root>
    <Panel.Header>
      <Toolbar.Root>
        <Toolbar.Text>{title}</Toolbar.Text>
      </Toolbar.Root>
    </Panel.Header>
    <Panel.Body asChild>
      <ScrollArea.Root orientation='all'>
        <ScrollArea.Viewport>
          <pre className='m-0 p-2 whitespace-pre text-xs font-mono select-text'>{children}</pre>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);

/** The stored reification beside the named-graph form `docs/QUESTIONS.md` §1 proposes, for the same facts. */
const NamedGraphsStory = () => {
  const stored = useMemo(() => [TURTLE_PREFIXES, ...RDF_FACTS.map(formatRawFact)].join('\n\n'), []);
  const proposed = useMemo(() => formatNamedGraphs(RDF_FACTS, RESOLVED), []);
  return (
    <Layout.Grid cols={2} grow>
      <Source title='Stored: reified facts (Turtle)'>{stored}</Source>
      <Source title='Proposed: named graphs (TriG)'>{proposed}</Source>
    </Layout.Grid>
  );
};

type StoryProps = {
  /** Named rather than passed as objects, because storybook clones args and ECHO objects reject the writes. */
  scenario: keyof typeof SCENARIOS;
  defaultView?: AgentKnowledgeView;
};

const DefaultStory = ({ scenario, defaultView }: StoryProps) => {
  const knowledge = useMemo(() => SCENARIOS[scenario](), [scenario]);
  const { nodes, edges } = useMemo(() => toGraph(knowledge), [knowledge]);
  return (
    <AgentKnowledge.Root defaultView={defaultView}>
      <AgentKnowledge.Memories memories={knowledge.memories.map(({ memory }) => memory)} now={NOW} />
      <AgentKnowledge.Facts facts={scenario === 'empty' ? [] : FACTS} now={NOW} />
      <AgentKnowledge.Goals goals={scenario === 'empty' ? [] : GOALS} />
      <AgentKnowledge.Graph nodes={nodes} edges={edges} />
    </AgentKnowledge.Root>
  );
};

const meta = {
  title: 'plugins/plugin-agent/components/AgentKnowledge',
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
  args: { scenario: 'default' },
};

export const Empty: Story = {
  args: { scenario: 'empty' },
};

export const Facts: Story = {
  args: { scenario: 'default', defaultView: 'facts' },
};

export const Goals: Story = {
  args: { scenario: 'default', defaultView: 'goals' },
};

export const LargeGraph: Story = {
  args: { scenario: 'large', defaultView: 'graph' },
};

export const NamedGraphs: Story = {
  args: { scenario: 'default' },
  render: () => <NamedGraphsStory />,
};
