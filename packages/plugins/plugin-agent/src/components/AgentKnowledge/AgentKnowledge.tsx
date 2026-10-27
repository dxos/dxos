//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { RDF } from '@dxos/pipeline-rdf';
import * as ForceGraph from '@dxos/plugin-explorer/ForceGraph';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as Typography from '@dxos/react-ui/Typography';
import { type SpaceGraphEdge, SpaceGraphModel, type SpaceGraphNode } from '@dxos/schema';

import { type Goal } from '#types';

import { AgentNamespace } from '../../namespace.ts';
import { EntityBrowser } from './EntityBrowser.tsx';
import { type EntityCardProps } from './EntityCard.tsx';
import { KnowledgeCard, KnowledgeStack } from './KnowledgeStack.tsx';
import { type EntityCardModel } from './subgraph.ts';
import { TRIG_PREFIXES, formatRawFact } from './trig.ts';
import { TurtleSnippet } from './TurtleSnippet.tsx';

//
// Root
//

const VIEWS = ['facts', 'entities', 'predicates', 'goals', 'graph'] as const;

type AgentKnowledgeView = (typeof VIEWS)[number];

const READY: AgentKnowledgeBrainStatus = { state: 'ready' };

const isView = (value: string): value is AgentKnowledgeView => VIEWS.some((view) => view === value);

type AgentKnowledgeContextValue = {
  view: AgentKnowledgeView;
  /** Whether the Facts view shows each fact's triple and metadata, and the Predicates view the ontology as TriG. */
  raw: boolean;
  brain: AgentKnowledgeBrainStatus;
};

/** Facts are read from the agent's brain, so an empty list means nothing only once a read has returned. */
type AgentKnowledgeBrainStatus =
  | { state: 'loading' }
  | { state: 'resetting' }
  | { state: 'ready' }
  | { state: 'error'; error: string };

const AgentKnowledgeContext = createContext<AgentKnowledgeContextValue>({
  view: 'facts',
  raw: false,
  brain: { state: 'ready' },
});

type AgentKnowledgeRootProps = PropsWithChildren<{
  role?: string;
  defaultView?: AgentKnowledgeView;
  /** Forgets everything the agent knows; the toolbar shows Reset only when given. */
  onReset?: () => void;
  /** Whether the brain's facts have been read; ready when omitted. */
  brain?: AgentKnowledgeBrainStatus;
}>;

/**
 * What the agent knows, one view at a time: its facts, the entities they relate, the predicates its brain states them
 * with, the goals it serves and its knowledge graph.
 */
const AgentKnowledgeRoot = ({
  role,
  defaultView = 'facts',
  onReset,
  brain = READY,
  children,
}: AgentKnowledgeRootProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const [view, setView] = useState<AgentKnowledgeView>(defaultView);
  const [raw, setRaw] = useState(false);
  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().root({ label: ['agent-knowledge-actions.label', { ns: AgentNamespace.key }] });
    // The tabs lead and the gap pushes the actions to the end.
    builder
      .custom('tabs', { label: ['agent-knowledge-actions.label', { ns: AgentNamespace.key }] }, () => (
        <Tabs.List>
          <Tabs.Trigger value='facts' data-testid='agent-knowledge-tab-facts'>
            {t('agent-knowledge-facts.label')}
          </Tabs.Trigger>
          <Tabs.Trigger value='entities' data-testid='agent-knowledge-tab-entities'>
            {t('agent-knowledge-entities.label')}
          </Tabs.Trigger>
          <Tabs.Trigger value='predicates' data-testid='agent-knowledge-tab-predicates'>
            {t('agent-knowledge-predicates.label')}
          </Tabs.Trigger>
          <Tabs.Trigger value='goals' data-testid='agent-knowledge-tab-goals'>
            {t('agent-knowledge-goals.label')}
          </Tabs.Trigger>
          <Tabs.Trigger value='graph' data-testid='agent-knowledge-tab-graph'>
            {t('agent-knowledge-graph.label')}
          </Tabs.Trigger>
        </Tabs.List>
      ))
      .separator('gap');
    if (view === 'facts' || view === 'predicates') {
      builder.action(
        'raw',
        {
          label: [
            view === 'facts' ? 'agent-knowledge-raw-facts.label' : 'agent-knowledge-raw-predicates.label',
            { ns: AgentNamespace.key },
          ],
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
          label: ['agent-knowledge-reset.label', { ns: AgentNamespace.key }],
          icon: 'ph--trash--regular',
          testId: 'agent-knowledge-reset',
        },
        () => onReset(),
      );
    }
    return builder.build();
  }, [view, raw, onReset, t]);
  const context = useMemo(() => ({ view, raw, brain }), [view, raw, brain]);
  return (
    <Tabs.Root asChild orientation='horizontal' value={view} onValueChange={(value) => isView(value) && setView(value)}>
      <Panel.Root role={role}>
        <Panel.Header>
          <ActionToolbar {...menuActions} alwaysActive />
        </Panel.Header>
        {/* Views render their own Panel.Body (rather than `Tabs.Content`, whose content mounts hidden for a frame,
            where the force graph would measure zero), so a list's ScrollArea is the body and gets its height. */}
        <AgentKnowledgeContext.Provider value={context}>{children}</AgentKnowledgeContext.Provider>
      </Panel.Root>
    </Tabs.Root>
  );
};

AgentKnowledgeRoot.displayName = 'AgentKnowledge.Root';

const StatusBody = ({ children }: PropsWithChildren) => (
  <Panel.Body>
    <Status.Empty>{children}</Status.Empty>
  </Panel.Body>
);

/** The status that stands in for a brain-backed view while it is read or wiped, or failed to read; undefined once read. */
const useBrainStatusMessage = (): string | undefined => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
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
// Facts
//

type AgentKnowledgeFact = {
  id: string;
  /** Subject, predicate and object. */
  text: string;
  /** The name of the source it was read from or recorded in. */
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

/** The facts that hold in the agent's brain, read from sources or recorded by the agent, newest first. */
const AgentKnowledgeFacts = ({ facts, now }: AgentKnowledgeFactsProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const { view, raw } = useContext(AgentKnowledgeContext);
  const status = useBrainStatusMessage();
  if (view !== 'facts') {
    return null;
  }

  return facts.length === 0 || status ? (
    <StatusBody>{status ?? t('agent-knowledge-facts-empty.message')}</StatusBody>
  ) : (
    <KnowledgeStack
      items={facts}
      getId={(fact) => fact.id}
      getText={(fact) => [fact.text, fact.source, fact.speaker].filter(Boolean).join(' ')}
      before={
        raw && (
          <TurtleSnippet
            data-testid='agent-knowledge-fact-prefixes'
            className='p-2 overflow-x-auto text-xs select-text cursor-text'
            source={TRIG_PREFIXES}
          />
        )
      }
      renderItem={(fact) => (
        <KnowledgeCard
          icon='ph--graph--regular'
          title={fact.text}
          testId='agent-knowledge-fact'
          rows={[
            ...(fact.source
              ? [{ label: t('agent-knowledge-source.label'), value: <Card.Text truncate>{fact.source}</Card.Text> }]
              : []),
            ...(fact.speaker
              ? [{ label: t('agent-knowledge-speaker.label'), value: <Card.Text truncate>{fact.speaker}</Card.Text> }]
              : []),
            {
              label: t('agent-knowledge-said.label'),
              value: (
                <Card.Text>
                  <Typography.Timestamp date={fact.saidAt} now={now} />
                </Card.Text>
              ),
            },
          ]}
        >
          {raw && fact.fact && (
            <TurtleSnippet
              data-testid='agent-knowledge-fact-raw'
              className='p-2 overflow-x-auto text-xs select-text cursor-text'
              source={formatRawFact(fact.fact)}
            />
          )}
        </KnowledgeCard>
      )}
    />
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
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const status = useBrainStatusMessage();
  if (useContext(AgentKnowledgeContext).view !== 'entities') {
    return null;
  }

  return cards.length === 0 || status ? (
    <StatusBody>{status ?? t('agent-knowledge-entities-empty.message')}</StatusBody>
  ) : (
    <Panel.Body asChild>
      <EntityBrowser cards={cards} hues={ENTITY_HUES} />
    </Panel.Body>
  );
};

AgentKnowledgeEntities.displayName = 'AgentKnowledge.Entities';

//
// Predicates
//

type AgentKnowledgePredicate = {
  iri: string;
  /** The IRI as a prefixed name (`schema:worksFor`, `brain:tutor`). */
  curie: string;
  label: string;
  /** The vocabulary that defines it (`schema`, `foaf`, `dx`), or `brain` for one the agent's extractor minted. */
  vocabulary?: string;
  description?: string;
  synonyms?: readonly string[];
  /** How many facts state it. */
  count: number;
};

type AgentKnowledgePredicatesProps = {
  /** The brain's predicates: the seed vocabulary, then those its extractor minted. */
  predicates: readonly AgentKnowledgePredicate[];
  /** The ontology graph as TriG, shown in place of the list when the view asks for raw. */
  trig?: string;
};

/** The predicates the agent's brain knows: the seed vocabulary every brain starts with, and those it minted. */
const AgentKnowledgePredicates = ({ predicates, trig }: AgentKnowledgePredicatesProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  const { view, raw } = useContext(AgentKnowledgeContext);
  if (view !== 'predicates') {
    return null;
  }

  return (
    <KnowledgeStack
      items={raw && trig ? [] : predicates}
      getId={(predicate) => predicate.iri}
      getText={(predicate) =>
        [
          predicate.label,
          RDF.Predicate.label(predicate.label),
          predicate.curie,
          predicate.description,
          ...(predicate.synonyms ?? []),
        ]
          .filter(Boolean)
          .join(' ')
      }
      before={
        raw &&
        trig && (
          <TurtleSnippet
            data-testid='agent-knowledge-predicates-trig'
            className='p-2 overflow-x-auto text-xs select-text cursor-text'
            source={trig}
          />
        )
      }
      renderItem={(predicate) => <PredicateCard predicate={predicate} />}
    />
  );
};

AgentKnowledgePredicates.displayName = 'AgentKnowledge.Predicates';

/** One predicate as a read-only form: its label heads the card, its IRI, vocabulary, use and meaning the rows below. */
const PredicateCard = ({ predicate }: { predicate: AgentKnowledgePredicate }) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  return (
    <KnowledgeCard
      icon='ph--arrow-right--regular'
      title={RDF.Predicate.label(predicate.label)}
      testId='agent-knowledge-predicate'
      rows={[
        {
          label: t('agent-knowledge-predicate-iri.label'),
          value: (
            <Card.Text truncate classNames='font-mono'>
              {predicate.curie}
            </Card.Text>
          ),
        },
        {
          label: t('agent-knowledge-predicate-vocabulary.label'),
          value: (
            <Card.Text truncate>
              {predicate.vocabulary === 'brain'
                ? t('agent-knowledge-predicate-minted.label')
                : (predicate.vocabulary ?? '—')}
            </Card.Text>
          ),
        },
        ...(predicate.description
          ? [
              {
                label: t('agent-knowledge-predicate-description.label'),
                value: <Card.Text lines={3}>{predicate.description}</Card.Text>,
              },
            ]
          : []),
        ...(predicate.synonyms?.length
          ? [
              {
                label: t('agent-knowledge-predicate-synonyms.label'),
                value: <Card.Text truncate>{predicate.synonyms.join(', ')}</Card.Text>,
              },
            ]
          : []),
        // Its use comes last, after what it is.
        { label: t('agent-knowledge-predicate-facts.label'), value: <Card.Text>{predicate.count}</Card.Text> },
      ]}
    />
  );
};

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
  const { t } = Hooks.useTranslation(AgentNamespace.key);
  if (useContext(AgentKnowledgeContext).view !== 'goals') {
    return null;
  }

  return goals.length === 0 ? (
    <Panel.Body>
      <Status.Empty>{t('agent-knowledge-goals-empty.message')}</Status.Empty>
    </Panel.Body>
  ) : (
    <KnowledgeStack
      items={goals}
      getId={(goal) => goal.id}
      getText={(goal) =>
        [goal.title, goal.owners, ...goal.watches.map((watch) => watch.message)].filter(Boolean).join(' ')
      }
      renderItem={(goal) => (
        <KnowledgeCard
          icon='ph--target--regular'
          title={goal.title}
          testId='agent-knowledge-goal'
          data={{ 'data-status': goal.status }}
          rows={[
            {
              label: t('agent-knowledge-status.label'),
              value: <Card.Text>{t(`goal-status-${goal.status}.label`)}</Card.Text>,
            },
            ...(goal.owners
              ? [{ label: t('agent-knowledge-owners.label'), value: <Card.Text truncate>{goal.owners}</Card.Text> }]
              : []),
            ...goal.watches.map((watch) => ({
              label: t('agent-knowledge-watching.label'),
              value: (
                <Card.Text lines={3} data-testid='agent-knowledge-watch' title={watch.when}>
                  {t('agent-knowledge-watch.label', {
                    recipient: watch.recipient ?? t('agent-knowledge-watch-unnamed.label'),
                    message: watch.message,
                  })}
                </Card.Text>
              ),
            })),
          ]}
        />
      )}
    />
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
  /** `related`: entity → entity a fact relates it to; `owner`: goal → holder; `knows`: agent → entity. */
  kind: 'related' | 'owner' | 'knows';
};

type AgentKnowledgeGraphProps = {
  nodes: readonly AgentKnowledgeNode[];
  edges: readonly AgentKnowledgeEdge[];
};

/** The agent's knowledge as a force-directed graph of people, organizations and goals, linked by the facts. */
const AgentKnowledgeGraph = ({ nodes, edges }: AgentKnowledgeGraphProps) => {
  const { t } = Hooks.useTranslation(AgentNamespace.key);
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
      <Status.Empty>{t('agent-knowledge-graph-empty.message')}</Status.Empty>
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
  Facts: AgentKnowledgeFacts,
  Entities: AgentKnowledgeEntities,
  Predicates: AgentKnowledgePredicates,
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
  AgentKnowledgeNode,
  AgentKnowledgePredicate,
  AgentKnowledgePredicatesProps,
  AgentKnowledgeRootProps,
  AgentKnowledgeView,
  AgentKnowledgeWatch,
};
