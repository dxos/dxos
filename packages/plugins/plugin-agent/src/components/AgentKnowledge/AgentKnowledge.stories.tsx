//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { RDF } from '@dxos/pipeline-rdf';
import { Editor } from '@dxos/react-ui-editor';
import { Masonry } from '@dxos/react-ui-masonry';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { createBasicExtensions, createThemeExtensions, turtle } from '@dxos/ui-editor';

import { translations } from '#translations';

import { NOW, SCENARIOS, toGraph } from '../AgentState/testing.ts';
import {
  AgentKnowledge,
  type AgentKnowledgeBrainStatus,
  type AgentKnowledgeFact,
  type AgentKnowledgeGoal,
  type AgentKnowledgeView,
} from './AgentKnowledge.tsx';
import { EntityBrowser } from './EntityBrowser.tsx';
import { EntityCard } from './EntityCard.tsx';
import { type EntityCardModel, toEntityCards } from './subgraph.ts';
import { TRIG_PREFIXES, curie, formatNamedGraphs, formatRawFact } from './trig.ts';

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
  {
    id: 'f2',
    text: 'race is in v12 index migration',
    source: 'CI triage',
    speaker: 'dima',
    saidAt: hoursAgo(2),
  },
  {
    id: 'f3',
    text: 'Josiah reviews fix',
    source: 'CI triage',
    speaker: 'josiah',
    saidAt: hoursAgo(3),
  },
  {
    id: 'f4',
    text: '0.12 release is on 10 October',
    source: 'Release notes',
    saidAt: hoursAgo(26),
  },
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
const slugOf = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

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

/** Read-only Turtle/TriG in the editor, highlighted by the `turtle` language. */
const Source = ({ title, children }: { title: string; children: string }) => {
  const themeMode = UiHooks.useThemeMode();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ readOnly: true, lineNumbers: true, lineWrapping: false }),
      createThemeExtensions({ themeMode, monospace: true, syntaxHighlighting: true }),
      turtle(),
    ],
    [themeMode],
  );
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{title}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Editor.Root>
          <Editor.View classNames='dx-fill' value={children} extensions={extensions} />
        </Editor.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

/** The named graphs the store writes beside the fuller form `docs/BRAIN.md` describes (graph-scoped entities), for the same facts. */
const NamedGraphsStory = () => {
  const stored = useMemo(() => [TRIG_PREFIXES, ...RDF_FACTS.map(formatRawFact)].join('\n\n'), []);
  const proposed = useMemo(() => formatNamedGraphs(RDF_FACTS, RESOLVED), []);
  return (
    <Layout.Grid cols={2} grow>
      <Source title='Stored: named graphs (TriG)'>{stored}</Source>
      <Source title='Proposed: named graphs (TriG)'>{proposed}</Source>
    </Layout.Grid>
  );
};

/** The graph around one researcher, as facts read from a profile page and a lab roster. */
const PROFILE = { source: 'https://example.com/alice', at: hoursAgo(5), hash: 'a11ce' };
const COLLEAGUES = ['Bob', 'Carol', ...Array.from({ length: 12 }, (_, index) => `Colleague ${index + 1}`)];
const PROFILE_FACTS: RDF.Fact[] = [
  rdfFact('p-1', [entity('alice', 'Alice Chen'), 'works at', entity('acme', 'Acme')], PROFILE),
  ...COLLEAGUES.map((name, index) =>
    rdfFact(`p-knows-${index}`, [entity('alice', 'Alice Chen'), 'knows', entity(slugOf(name), name)], PROFILE),
  ),
  rdfFact('p-2', [entity('alice', 'Alice Chen'), 'authored', entity('paper-a', 'Paper A')], PROFILE),
  rdfFact('p-trim-md', [entity('alice', 'Alice Chen'), 'authored', entity('paper-b', 'Paper B')], PROFILE),
  rdfFact('p-4', [entity('david', 'David'), 'knows', entity('alice', 'Alice Chen')], PROFILE),
  rdfFact('p-5', [entity('emma', 'Emma'), 'knows', entity('alice', 'Alice Chen')], PROFILE),
  rdfFact('p-6', [entity('bob', 'Bob'), 'works at', entity('acme', 'Acme')], PROFILE),
  // Literal objects are not entities: the card counts them and the browser opens them as statements.
  rdfFact('p-7', [entity('alice', 'Alice Chen'), 'has role', { kind: 'literal', literal: 'indexing lead' }], PROFILE),
  rdfFact('p-8', [entity('alice', 'Alice Chen'), 'prefers', { kind: 'literal', literal: 'async reviews' }], PROFILE),
];

const CARD_OPTIONS = {
  types: {
    ...Object.fromEntries(COLLEAGUES.map((name) => [slugOf(name), 'Person'])),
    'alice': 'Person',
    'bob': 'Person',
    'carol': 'Person',
    'david': 'Person',
    'emma': 'Person',
    'rich-burdon': 'Person',
    'dima': 'Person',
    'acme': 'Organization',
    'dxos': 'Organization',
    'paper-a': 'Document',
    'paper-b': 'Document',
    'founder': 'Role',
    'indexer': 'Project',
  },
  inverses: {
    'know': 'known-by',
    'author': 'authored-by',
    'work at': 'employs',
    'own': 'owned-by',
    'member of': 'members',
  },
};

/** One hue per type, chosen rather than hashed, so no two of the story's types share one. */
const CARD_HUES = {
  Person: 'amber',
  Organization: 'indigo',
  Document: 'pink',
  Role: 'emerald',
  Project: 'violet',
} as const;

const CARD_ICONS = {
  'work at': 'ph--buildings--regular',
  'know': 'ph--users--regular',
  'author': 'ph--file-text--regular',
  'own': 'ph--key--regular',
};

/** One card per entity of the graph: what it states, and below the rule what others state about it. */
const EntityCardTile = ({ data }: { data: EntityCardModel }) => (
  <EntityCard card={data} icons={CARD_ICONS} hues={CARD_HUES} onSelect={() => {}} onClose={() => {}} />
);

const SubgraphsStory = () => {
  const cards = useMemo(() => toEntityCards([...PROFILE_FACTS, ...RDF_FACTS], CARD_OPTIONS), []);
  return (
    <Panel.Root>
      <Panel.Body>
        <Masonry.Root Tile={EntityCardTile} minColumnWidth={20} maxColumnWidth={28}>
          <Masonry.Content>
            <Masonry.Viewport items={cards} getId={(card) => card.id} />
          </Masonry.Content>
        </Masonry.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

/** The story's graph as cards; objects (an employer, a paper) get cards too, so every chip opens one. */
const ENTITY_CARDS = toEntityCards([...PROFILE_FACTS, ...RDF_FACTS], { ...CARD_OPTIONS, objects: true });

/** Finder-style columns over the same graph. */
const BrowserStory = () => (
  <Panel.Root>
    <Panel.Body asChild>
      <EntityBrowser cards={ENTITY_CARDS} icons={CARD_ICONS} hues={CARD_HUES} />
    </Panel.Body>
  </Panel.Root>
);

type StoryProps = {
  /** Named rather than passed as objects, because storybook clones args and ECHO objects reject the writes. */
  scenario: keyof typeof SCENARIOS;
  defaultView?: AgentKnowledgeView;
  brain?: AgentKnowledgeBrainStatus;
};

/** The seed vocabulary, as the Predicates view lists it for a brain that has minted nothing yet. */
const SEED = RDF.Ontology.DEFAULT.withNamespace(RDF.Vocab.brainNamespace('story-agent'));
const PREDICATES = SEED.entries.map((entry) => ({
  iri: entry.iri,
  curie: curie(entry.iri, SEED.namespace),
  label: entry.label,
  vocabulary: curie(entry.iri, SEED.namespace).split(':')[0],
  ...(entry.description ? { description: entry.description } : {}),
  ...(entry.synonyms?.length ? { synonyms: entry.synonyms } : {}),
  count: 0,
}));

const DefaultStory = ({ scenario, defaultView, brain }: StoryProps) => {
  const knowledge = useMemo(() => SCENARIOS[scenario](), [scenario]);
  const { nodes, edges } = useMemo(() => toGraph(knowledge), [knowledge]);
  return (
    <AgentKnowledge.Root defaultView={defaultView} brain={brain}>
      <AgentKnowledge.Facts facts={scenario === 'empty' ? [] : FACTS} now={NOW} />
      <AgentKnowledge.Entities cards={scenario === 'empty' ? [] : ENTITY_CARDS} />
      <AgentKnowledge.Predicates predicates={PREDICATES} trig={RDF.Graph.ontologyToTriG(SEED)} />
      <AgentKnowledge.Goals goals={scenario === 'empty' ? [] : GOALS} />
      <AgentKnowledge.Graph nodes={nodes} edges={edges} />
    </AgentKnowledge.Root>
  );
};

const meta = {
  title: 'plugins/plugin-agent/components/AgentKnowledge',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'default',
  },
};

export const Empty: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'empty',
  },
};

export const Loading: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'empty',
    brain: { state: 'loading' },
  },
};

export const Facts: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'default',
    defaultView: 'facts',
  },
};

export const Entities: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'default',
    defaultView: 'entities',
  },
};

export const Predicates: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'default',
    defaultView: 'predicates',
  },
};

export const Goals: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'default',
    defaultView: 'goals',
  },
};

export const LargeGraph: Story = {
  decorators: [withLayout({ layout: 'column' })],
  args: {
    scenario: 'large',
    defaultView: 'graph',
  },
};

export const NamedGraphs: Story = {
  decorators: [withLayout({ layout: 'fullscreen' })],
  args: {
    scenario: 'default',
  },
  render: () => <NamedGraphsStory />,
};

export const Subgraphs: Story = {
  decorators: [withLayout({ layout: 'fullscreen' })],
  args: {
    scenario: 'default',
  },
  render: () => <SubgraphsStory />,
};

export const Browser: Story = {
  decorators: [withLayout({ layout: 'fullscreen' })],
  args: { scenario: 'default' },
  render: () => <BrowserStory />,
};
