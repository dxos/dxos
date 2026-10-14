//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { type RDF } from '@dxos/pipeline-rdf';
import * as ForceGraph from '@dxos/plugin-explorer/ForceGraph';
import { Listbox } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';
import { type SpaceGraphEdge, SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';

import { meta } from '#meta';
import { type Goal, type Knowledge } from '#types';

import { MEMORY_ICONS } from '../ProfileGraph/index.ts';
import { EntityBrowser } from './EntityBrowser.tsx';
import { type EntityCardProps } from './EntityCard.tsx';
import { type EntityCardModel } from './subgraph.ts';
import { TRIG_PREFIXES, formatRawFact } from './trig.ts';
import { TurtleSnippet } from './TurtleSnippet.tsx';

//
// Root
//

const VIEWS = ['memories', 'facts', 'entities', 'goals', 'graph'] as const;

type AgentKnowledgeView = (typeof VIEWS)[number];

const READY: AgentKnowledgeBrainStatus = { state: 'ready' };

const isView = (value: string): value is AgentKnowledgeView => VIEWS.some((view) => view === value);

type AgentKnowledgeContextValue = {
  view: AgentKnowledgeView;
  /** Whether the Facts view shows each fact's triple and metadata under it. */
  raw: boolean;
  brain: AgentKnowledgeBrainStatus;
};

/** Memories and facts are read from the agent's brain, so an empty list means nothing only once a read has returned. */
type AgentKnowledgeBrainStatus =
  | { state: 'loading' }
  | { state: 'resetting' }
  | { state: 'ready' }
  | { state: 'error'; error: string };

const AgentKnowledgeContext = createContext<AgentKnowledgeContextValue>({
  view: 'memories',
  raw: false,
  brain: { state: 'ready' },
});

type AgentKnowledgeRootProps = PropsWithChildren<{
  role?: string;
  defaultView?: AgentKnowledgeView;
  /** Forgets everything the agent knows; the toolbar shows Reset only when given. */
  onReset?: () => void;
  /** Whether the brain's memories and facts have been read; ready when omitted. */
  brain?: AgentKnowledgeBrainStatus;
}>;

/** What the agent knows, one view at a time: its memories, the facts it read, the goals it serves and its knowledge graph. */
const AgentKnowledgeRoot = ({
  role,
  defaultView = 'memories',
  onReset,
  brain = READY,
  children,
}: AgentKnowledgeRootProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [view, setView] = useState<AgentKnowledgeView>(defaultView);
  const [raw, setRaw] = useState(false);
  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().root({ label: ['agent-knowledge-actions.label', { ns: meta.profile.key }] });
    if (view === 'facts') {
      builder.action(
        'raw',
        {
          label: ['agent-knowledge-raw-facts.label', { ns: meta.profile.key }],
          icon: 'ph--brackets-curly--regular',
          iconOnly: true,
          checked: raw,
          testId: 'agent-knowledge-raw-facts',
        },
        () => setRaw((value) => !value),
      );
    }
    if (onReset) {
      builder.action(
        'reset',
        {
          label: ['agent-knowledge-reset.label', { ns: meta.profile.key }],
          icon: 'ph--trash--regular',
          testId: 'agent-knowledge-reset',
        },
        () => onReset(),
      );
    }
    return builder.build();
  }, [view, raw, onReset]);
  const context = useMemo(() => ({ view, raw, brain }), [view, raw, brain]);
  return (
    <Tabs.Root asChild orientation='horizontal' value={view} onValueChange={(value) => isView(value) && setView(value)}>
      <Panel.Root role={role}>
        <Panel.Header>
          <ActionToolbar
            {...menuActions}
            alwaysActive
            // The tabs lead and the gap pushes the actions to the end.
            start={
              <>
                <Tabs.List>
                  <Tabs.Trigger value='memories' data-testid='agent-knowledge-tab-memories'>
                    {t('agent-knowledge-memories.label')}
                  </Tabs.Trigger>
                  <Tabs.Trigger value='facts' data-testid='agent-knowledge-tab-facts'>
                    {t('agent-knowledge-facts.label')}
                  </Tabs.Trigger>
                  <Tabs.Trigger value='entities' data-testid='agent-knowledge-tab-entities'>
                    {t('agent-knowledge-entities.label')}
                  </Tabs.Trigger>
                  <Tabs.Trigger value='goals' data-testid='agent-knowledge-tab-goals'>
                    {t('agent-knowledge-goals.label')}
                  </Tabs.Trigger>
                  <Tabs.Trigger value='graph' data-testid='agent-knowledge-tab-graph'>
                    {t('agent-knowledge-graph.label')}
                  </Tabs.Trigger>
                </Tabs.List>
                <Toolbar.Separator variant='gap' />
              </>
            }
          />
        </Panel.Header>
        {/* Views render their own Panel.Body (rather than `Tabs.Content`, whose content mounts hidden for a frame,
            where the force graph would measure zero), so a list's ScrollArea is the body and gets its height. */}
        <AgentKnowledgeContext.Provider value={context}>{children}</AgentKnowledgeContext.Provider>
      </Panel.Root>
    </Tabs.Root>
  );
};

AgentKnowledgeRoot.displayName = 'AgentKnowledge.Root';

const Status = ({ children }: PropsWithChildren) => (
  <Panel.Body>
    <Layout.Flex center classNames='p-2 text-fg-muted' role='status'>
      {children}
    </Layout.Flex>
  </Panel.Body>
);

/** The status that stands in for a brain-backed view while it is read or wiped, or failed to read; undefined once read. */
const useBrainStatusMessage = (): string | undefined => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { brain } = useContext(AgentKnowledgeContext);
  switch (brain.state) {
    case 'loading':
      return t('agent-knowledge-loading.message');
    case 'resetting':
      return t('agent-knowledge-resetting.message');
    case 'error':
      return t('agent-knowledge-error.message', { error: brain.error });
    default:
      return undefined;
  }
};

//
// Memories
//

type AgentKnowledgeMemory = Pick<Knowledge.Memory, 'id' | 'content' | 'kind' | 'observedAt'>;

type AgentKnowledgeMemoriesProps = {
  /** Newest first. */
  memories: readonly AgentKnowledgeMemory[];
  /** Fixes the instant timestamps are measured against, so stories and tests do not drift. */
  now?: Typography.TimestampProps['now'];
};

/** The agent's active memories, newest first. */
const AgentKnowledgeMemories = ({ memories, now }: AgentKnowledgeMemoriesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const status = useBrainStatusMessage();
  if (useContext(AgentKnowledgeContext).view !== 'memories') {
    return null;
  }

  return memories.length === 0 || status ? (
    <Status>{status ?? t('agent-knowledge-memories-empty.message')}</Status>
  ) : (
    <Panel.Body asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport asChild>
          <Layout.Container>
            <Listbox.Root
              items={memories.map((memory) => ({
                value: memory.id,
                label: memory.content,
                icon: MEMORY_ICONS[memory.kind],
              }))}
            >
              <Listbox.Content>
                {memories.map((memory) => (
                  <Listbox.Item key={memory.id} id={memory.id}>
                    <Listbox.ItemIcon />
                    <Listbox.ItemText />
                    <Listbox.ItemDescription>
                      {t(`memory-kind-${memory.kind}.label`)} ·{' '}
                      <Typography.Timestamp date={memory.observedAt} now={now} />
                    </Listbox.ItemDescription>
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          </Layout.Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  );
};

AgentKnowledgeMemories.displayName = 'AgentKnowledge.Memories';

//
// Facts
//

type AgentKnowledgeFact = {
  id: string;
  /** Subject, predicate and object. */
  text: string;
  /** The name of the source it was read from. */
  source?: string;
  /** Who said it, when known. */
  speaker?: string;
  saidAt: string;
  /** The fact as stored, shown as its triple and metadata when the view asks for it. */
  fact?: RDF.Fact;
};

type AgentKnowledgeFactsProps = {
  /** Newest first. */
  facts: readonly AgentKnowledgeFact[];
  /** Fixes the instant timestamps are measured against, so stories and tests do not drift. */
  now?: Typography.TimestampProps['now'];
};

/** The facts the agent read from documents, pages and conversations, newest first. */
const AgentKnowledgeFacts = ({ facts, now }: AgentKnowledgeFactsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { view, raw } = useContext(AgentKnowledgeContext);
  const status = useBrainStatusMessage();
  if (view !== 'facts') {
    return null;
  }

  return facts.length === 0 || status ? (
    <Status>{status ?? t('agent-knowledge-facts-empty.message')}</Status>
  ) : (
    <Panel.Body asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport asChild>
          <Layout.Container>
            {raw && (
              <pre
                data-testid='agent-knowledge-fact-prefixes'
                className='m-0 p-2 overflow-x-auto whitespace-pre text-xs font-mono text-fg-muted select-text'
              >
                {TRIG_PREFIXES}
              </pre>
            )}
            <Listbox.Root
              items={facts.map((fact) => ({ value: fact.id, label: fact.text, icon: 'ph--graph--regular' }))}
            >
              <Listbox.Content>
                {facts.map((fact) => (
                  <Listbox.Item key={fact.id} id={fact.id} data-testid='agent-knowledge-fact'>
                    <Listbox.ItemIcon />
                    <Listbox.ItemText />
                    <Listbox.ItemDescription>
                      {[fact.source, fact.speaker].flatMap((part) => (part ? [`${part} · `] : []))}
                      <Typography.Timestamp date={fact.saidAt} now={now} />
                    </Listbox.ItemDescription>
                    {raw && fact.fact && (
                      <TurtleSnippet
                        data-place='full'
                        data-testid='agent-knowledge-fact-raw'
                        className='p-2 overflow-x-auto text-xs select-text cursor-text'
                        // The row's own press handlers select the row and cancel the drag that selects text.
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        source={formatRawFact(fact.fact)}
                      />
                    )}
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          </Layout.Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  );
};

AgentKnowledgeFacts.displayName = 'AgentKnowledge.Facts';

//
// Entities
//

/** One hue per entity type the brain assigns, chosen rather than hashed so no two types share one. */
const ENTITY_HUES: EntityCardProps['hues'] = {
  Person: 'amber',
  Organization: 'indigo',
  Place: 'emerald',
  Event: 'pink',
  Concept: 'violet',
  Thing: 'neutral',
};

type AgentKnowledgeEntitiesProps = {
  /** One card per entity in the agent's brain (see `toEntityCards`). */
  cards: readonly EntityCardModel[];
};

/** The agent's brain as entity cards in Finder-style columns: choosing a card or a chip opens what it relates to. */
const AgentKnowledgeEntities = ({ cards }: AgentKnowledgeEntitiesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const status = useBrainStatusMessage();
  if (useContext(AgentKnowledgeContext).view !== 'entities') {
    return null;
  }

  return cards.length === 0 || status ? (
    <Status>{status ?? t('agent-knowledge-entities-empty.message')}</Status>
  ) : (
    <Panel.Body asChild>
      <EntityBrowser cards={cards} hues={ENTITY_HUES} />
    </Panel.Body>
  );
};

AgentKnowledgeEntities.displayName = 'AgentKnowledge.Entities';

//
// Goals
//

type AgentKnowledgeWatch = {
  id: string;
  /** The pattern a fact must match, as one line. */
  when: string;
  /** The name of who is told when it fires. */
  recipient?: string;
  message: string;
};

type AgentKnowledgeGoal = {
  id: string;
  title: string;
  status: Goal.Status;
  /** The names of who holds it. */
  owners?: string;
  /** What the agent is waiting for on the goal's behalf. */
  watches: readonly AgentKnowledgeWatch[];
};

type AgentKnowledgeGoalsProps = {
  goals: readonly AgentKnowledgeGoal[];
};

/** The goals the agent serves, each followed by the facts it is watching for. */
const AgentKnowledgeGoals = ({ goals }: AgentKnowledgeGoalsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (useContext(AgentKnowledgeContext).view !== 'goals') {
    return null;
  }

  return goals.length === 0 ? (
    <Panel.Body>
      <Layout.Flex center classNames='p-2 text-fg-muted' role='status'>
        {t('agent-knowledge-goals-empty.message')}
      </Layout.Flex>
    </Panel.Body>
  ) : (
    <Panel.Body asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport asChild>
          <Layout.Container>
            <Listbox.Root
              items={goals.flatMap((goal) => [
                {
                  value: goal.id,
                  label: goal.title,
                  icon: 'ph--target--regular',
                  description: [t(`goal-status-${goal.status}.label`), goal.owners]
                    .filter((part) => part !== undefined)
                    .join(' · '),
                },
                ...goal.watches.map((watch) => ({
                  value: watch.id,
                  label: t('agent-knowledge-watch.label', {
                    recipient: watch.recipient ?? t('agent-knowledge-watch-unnamed.label'),
                    message: watch.message,
                  }),
                  icon: 'ph--binoculars--regular',
                  description: watch.when,
                })),
              ])}
            >
              <Listbox.Content>
                {goals.flatMap((goal) => [
                  <Listbox.Item
                    key={goal.id}
                    id={goal.id}
                    data-testid='agent-knowledge-goal'
                    data-status={goal.status}
                  />,
                  ...goal.watches.map((watch) => (
                    <Listbox.Item key={watch.id} id={watch.id} data-testid='agent-knowledge-watch' classNames='ps-6' />
                  )),
                ])}
              </Listbox.Content>
            </Listbox.Root>
          </Layout.Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  );
};

AgentKnowledgeGoals.displayName = 'AgentKnowledge.Goals';

//
// Graph
//

type AgentKnowledgeNode = {
  id: string;
  label: string;
  /** Colors the node by its type; plain nodes render uncolored. */
  object?: Obj.Unknown;
};

type AgentKnowledgeEdge = {
  source: string;
  target: string;
  /** `subject`: memory → entity it is about; `owner`: goal → holder; `knows`: agent → entity. */
  kind: 'subject' | 'owner' | 'knows';
};

type AgentKnowledgeGraphProps = {
  nodes: readonly AgentKnowledgeNode[];
  edges: readonly AgentKnowledgeEdge[];
};

/** The agent's knowledge as a force-directed graph of people, organizations, goals and memories. */
const AgentKnowledgeGraph = ({ nodes, edges }: AgentKnowledgeGraphProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const active = useContext(AgentKnowledgeContext).view === 'graph';
  // One model for the component's life, so the layout keeps its positions as the knowledge grows.
  const model = useMemo(() => new SpaceGraphModel(), []);
  useEffect(() => {
    const ids = new Set(nodes.map((node) => node.id));
    model.setGraph({
      nodes: nodes.map(({ id, label, object }): SpaceGraphNode => ({ id, type: 'object', data: { label, object } })),
      edges: edges
        .filter(({ source, target }) => ids.has(source) && ids.has(target))
        .map(({ source, target, kind }): SpaceGraphEdge => ({
          id: `${source}-${kind}-${target}`,
          type: kind,
          source,
          target,
        })),
    });
  }, [model, nodes, edges]);

  if (!active) {
    return null;
  }

  return nodes.length === 0 ? (
    <Panel.Body>
      <Layout.Flex center classNames='p-2 text-fg-muted' role='status'>
        {t('agent-knowledge-graph-empty.message')}
      </Layout.Flex>
    </Panel.Body>
  ) : (
    <Panel.Body asChild>
      <ForceGraph.Root model={model} />
    </Panel.Body>
  );
};

AgentKnowledgeGraph.displayName = 'AgentKnowledge.Graph';

//
// AgentKnowledge
//

export const AgentKnowledge = {
  Root: AgentKnowledgeRoot,
  Memories: AgentKnowledgeMemories,
  Facts: AgentKnowledgeFacts,
  Entities: AgentKnowledgeEntities,
  Goals: AgentKnowledgeGoals,
  Graph: AgentKnowledgeGraph,
};

export type {
  AgentKnowledgeBrainStatus,
  AgentKnowledgeEdge,
  AgentKnowledgeEntitiesProps,
  AgentKnowledgeFact,
  AgentKnowledgeFactsProps,
  AgentKnowledgeGoal,
  AgentKnowledgeGoalsProps,
  AgentKnowledgeGraphProps,
  AgentKnowledgeMemoriesProps,
  AgentKnowledgeMemory,
  AgentKnowledgeNode,
  AgentKnowledgeRootProps,
  AgentKnowledgeView,
  AgentKnowledgeWatch,
};
