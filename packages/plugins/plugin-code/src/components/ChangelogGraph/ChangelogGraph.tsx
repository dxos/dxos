//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useContext, useMemo } from 'react';

import {
  type CreateProps,
  type GraphEdge,
  type GraphModel,
  type NodeViewProps,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
} from '@dxos/react-ui-canvas/scene';
import { Graph2DView, type GraphLayoutOptions } from '@dxos/react-ui-scene';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import { type Node, nodeBase } from '@dxos/scene';

import { CodeNamespace } from '../../namespace.ts';
import {
  type ChangelogEdgeKind,
  type ChangelogGraphModel,
  type ChangelogNodeModel,
  type DecisionActor,
  type DecisionModel,
  type QuestionModel,
  type SpecBlockModel,
  buildChangelogGraph,
  githubAvatarUrl,
} from './decision-model.ts';

const DECISION_NODE_TYPE = 'decision';
const BLOCK_NODE_TYPE = 'spec-block';

/** Colour and icon together, so the decider never reads from colour alone. */
export const ACTOR_STYLE: Record<DecisionActor, { icon: string; hue: Tag.TagHue; frame: string }> = {
  user: { icon: 'ph--user--regular', hue: 'sky', frame: 'border-2 border-sky-border' },
  agent: { icon: 'ph--robot--regular', hue: 'violet', frame: 'border-2 border-dashed border-violet-border' },
};

export type ActorAvatarProps = { actor?: DecisionActor; handle?: string; label?: string };

/** A person's GitHub avatar, or an icon for an agent or an unattributed entry. */
export const ActorAvatar = ({ actor, handle, label }: ActorAvatarProps) =>
  actor === 'user' && handle ? (
    <Avatar.Root
      size='sm'
      src={githubAvatarUrl(handle)}
      fallback={handle}
      label={label}
      data-testid='changelog-graph.avatar'
    />
  ) : (
    <Avatar.Root
      size='sm'
      icon={actor ? ACTOR_STYLE[actor].icon : 'ph--question--regular'}
      hue={actor ? Avatar.toAvatarHue(ACTOR_STYLE[actor].hue) : undefined}
      label={label}
    />
  );

/** Arrows point at the entry cited, so each edge reads from the later decision: "D-5 supersedes D-3". */
const EDGE_STYLE: Record<ChangelogEdgeKind, Pick<GraphEdge, 'ends' | 'style'> & { labelled: boolean }> = {
  'builds-on': { ends: { start: 'arrow' }, labelled: false },
  'supersedes': { ends: { start: 'arrow' }, style: { hue: 'red', lineStyle: 'dashed' }, labelled: true },
  'approves': { ends: { start: 'arrow' }, style: { hue: 'green' }, labelled: true },
  'answers': { ends: { start: 'arrow' }, style: { hue: 'amber' }, labelled: true },
  'affects': { ends: { end: 'arrow' }, style: { hue: 'sky', lineStyle: 'dotted' }, labelled: false },
};

const DecisionNode = Schema.Struct({ type: Schema.Literal(DECISION_NODE_TYPE), ...nodeBase });
const BlockNode = Schema.Struct({ type: Schema.Literal(BLOCK_NODE_TYPE), ...nodeBase });

const createDecisionNode = (props: CreateProps): Node => ({ type: DECISION_NODE_TYPE, ...props });
const createBlockNode = (props: CreateProps): Node => ({ type: BLOCK_NODE_TYPE, ...props });

type NodeLookup = (id: string) => ChangelogNodeModel | undefined;

/** Node views get no host props, so the decisions reach them through context. */
const NodeLookupContext = createContext<NodeLookup>(() => undefined);

const SelectedContext = createContext<string | undefined>(undefined);

const DecisionCard = ({ decision }: { decision: DecisionModel }) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { entry, actor, handle, principal, supersededBy, approvedBy } = decision;
  const style = actor ? ACTOR_STYLE[actor] : undefined;
  const selected = useContext(SelectedContext) === entry.id;
  return (
    <Card.Root
      grid
      selected={selected}
      classNames={[style?.frame, supersededBy && 'opacity-60']}
      data-testid='changelog-graph.decision'
      data-decision={entry.id}
      data-actor={actor}
      data-superseded={supersededBy ? '' : undefined}
    >
      <Card.Header>
        <Layout.Block rail='start'>
          <ActorAvatar
            actor={actor}
            handle={handle}
            label={actor ? t(`changelog-graph.actor.${actor}.label`) : undefined}
          />
        </Layout.Block>
        <Card.Title lines={1}>
          {entry.id} · {handle ?? t('changelog-graph.unknown-actor.label')}
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Row>
          <Card.Text lines={3} classNames={supersededBy && 'line-through'}>
            {entry.title}
          </Card.Text>
        </Card.Row>
        {/* A person's stated reason, or an agent's: the two carry different authority, so they read differently. */}
        {actor === 'user' && (entry.quote ?? entry.why) && (
          <Card.Row icon={entry.quote ? 'ph--quotes--regular' : 'ph--chat-text--regular'}>
            <Card.Text variant='muted' lines={2} classNames='italic' data-testid='changelog-graph.quote'>
              {entry.quote ?? entry.why}
            </Card.Text>
          </Card.Row>
        )}
        {actor === 'agent' && entry.why && (
          <Card.Row icon='ph--lightbulb--regular'>
            <Card.Text variant='muted' lines={2}>
              {entry.why}
            </Card.Text>
          </Card.Row>
        )}
        {principal && (
          <Card.Row icon='ph--user-focus--regular' trailing={<ActorAvatar actor='user' handle={principal} />}>
            <Card.Text truncate data-testid='changelog-graph.principal'>
              {t('changelog-graph.for.label', { principal })}
            </Card.Text>
          </Card.Row>
        )}
        <Card.Row>
          <Layout.Flex wrap gap='xs'>
            {style && actor && (
              <Tag.Tag hue={style.hue}>
                <Icon.Icon icon={style.icon} size='xs' />
                {t(`changelog-graph.actor.${actor}.label`)}
              </Tag.Tag>
            )}
            {entry.date && <Tag.Tag>{entry.date}</Tag.Tag>}
            {supersededBy && (
              <Tag.Tag hue='error' data-testid='changelog-graph.superseded'>
                {t('changelog-graph.superseded-by.label', { id: supersededBy })}
              </Tag.Tag>
            )}
            {approvedBy.length > 0 && (
              <Tag.Tag hue='success' data-testid='changelog-graph.approved'>
                {t('changelog-graph.approved-in.label', { ids: approvedBy.join(', ') })}
              </Tag.Tag>
            )}
          </Layout.Flex>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};

const QuestionNodeCard = ({ question }: { question: QuestionModel }) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { entry, actor, handle, answer } = question;
  const selected = useContext(SelectedContext) === entry.id;
  return (
    <Card.Root
      grid
      selected={selected}
      classNames={['border-2 border-warning-border', answer && 'opacity-60']}
      data-testid='changelog-graph.question'
      data-question={entry.id}
      data-answered={answer ? '' : undefined}
    >
      <Card.Header>
        <Layout.Block rail='start'>
          <ActorAvatar actor={actor} handle={handle} />
        </Layout.Block>
        <Card.Title lines={1}>
          {entry.id} · {handle ?? t('changelog-graph.unknown-actor.label')}
        </Card.Title>
      </Card.Header>
      <Card.Body>
        <Card.Row icon='ph--question--regular'>
          <Card.Text lines={3}>{entry.title}</Card.Text>
        </Card.Row>
        <Card.Row>
          <Layout.Flex wrap gap='xs'>
            {entry.date && <Tag.Tag>{entry.date}</Tag.Tag>}
            {answer ? (
              <Tag.Tag hue='success'>{t('changelog-graph.question.answered-in.label', { id: answer.id })}</Tag.Tag>
            ) : (
              <Tag.Tag hue='warning'>{t('changelog-graph.question.open.label')}</Tag.Tag>
            )}
          </Layout.Flex>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};

const BlockChip = ({ block }: { block: SpecBlockModel }) => (
  <Layout.Flex
    classNames='dx-cover items-center justify-center gap-2 rounded-sm border border-dashed border-separator bg-card-surface'
    data-testid='changelog-graph.block'
  >
    <Icon.Icon icon='ph--puzzle-piece--regular' />
    <span className='font-mono'>{block.label}</span>
  </Layout.Flex>
);

const ChangelogNodeView = ({ node }: NodeViewProps) => {
  const model = useContext(NodeLookupContext)(node.id);
  return (
    // Inert, so a press anywhere on the card selects and drags the box rather than reaching the card.
    <Layout.Grid classNames='dx-cover overflow-hidden pointer-events-none'>
      {model?.kind === 'decision' && <DecisionCard decision={model} />}
      {model?.kind === 'question' && <QuestionNodeCard question={model} />}
      {model?.kind === 'block' && <BlockChip block={model} />}
    </Layout.Grid>
  );
};

const nodeDef = {
  component: ChangelogNodeView,
  resizable: false,
  palette: false,
  // The card draws its own frame.
  bare: true,
} as const;

const nodes = createNodeRegistry(
  {
    ...defaultNodeTypes,
    [DECISION_NODE_TYPE]: {
      ...nodeDef,
      name: 'Decision',
      icon: 'ph--gavel--regular',
      schema: DecisionNode,
      create: createDecisionNode,
      defaultSize: { width: 3, height: 2 },
    },
    [BLOCK_NODE_TYPE]: {
      ...nodeDef,
      name: 'Spec block',
      icon: 'ph--puzzle-piece--regular',
      schema: BlockNode,
      create: createBlockNode,
      defaultSize: { width: 2, height: 1 },
    },
  },
  defaultNodePrototypes,
);

const BLOCK_SIZE = { width: 144, height: 48 };

const createLayout = (lookup: NodeLookup): GraphLayoutOptions => ({
  // The same 288×256 cards on a 320×320 pitch, as a lattice so smart links route through the gutters around the cards.
  lattice: { width: 288, height: 256, gutterX: 32, gutterY: 64 },
  shape: (node) =>
    lookup(node.id)?.kind === 'block' ? { type: BLOCK_NODE_TYPE, size: BLOCK_SIZE } : { type: DECISION_NODE_TYPE },
});

const toGraph = (model: ChangelogGraphModel, label: (kind: ChangelogEdgeKind) => string): GraphModel => ({
  nodes: model.nodes.map((node) => ({ id: node.id, label: node.kind === 'block' ? node.label : node.entry.title })),
  edges: model.edges.map(({ id, kind, from, to }) => {
    const { labelled, ...style } = EDGE_STYLE[kind];
    return { id, from, to, ...style, ...(labelled && { text: label(kind) }) };
  }),
});

const Legend = () => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  return (
    <Layout.Flex
      wrap
      gap='xs'
      classNames='absolute top-2 start-2 z-10 p-2 rounded-sm bg-base-surface border border-separator'
      data-testid='changelog-graph.legend'
    >
      {Object.entries(ACTOR_STYLE).map(([actor, style]) => (
        <Tag.Tag key={actor} hue={style.hue}>
          <Icon.Icon icon={style.icon} size='xs' />
          {t(`changelog-graph.actor.${actor}.label`)}
        </Tag.Tag>
      ))}
      <Tag.Tag hue='error'>{t('changelog-graph.edge.supersedes.label')}</Tag.Tag>
      <Tag.Tag hue='success'>{t('changelog-graph.edge.approves.label')}</Tag.Tag>
      <Tag.Tag>{t('changelog-graph.edge.builds-on.label')}</Tag.Tag>
    </Layout.Flex>
  );
};

export type ChangelogGraphProps = {
  /** The text of a `.mdl` spec; only its `## Changelog` is drawn. */
  content: string;
  /** Adds a node per spec block named in `affects:`. */
  affects?: boolean;
  /** A decision id whose card is highlighted. */
  selected?: string;
};

/**
 * A spec's `## Changelog` as a graph: one card per decision, coloured and iconed by who decided, laid out in the
 * order it was written, with an arrow to each decision it builds on, supersedes or approves.
 */
export const ChangelogGraph = ({ content, affects = false, selected }: ChangelogGraphProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const model = useMemo(() => buildChangelogGraph(content, { affects }), [content, affects]);
  const lookup = useMemo<NodeLookup>(() => {
    const byId = new Map(model.nodes.map((node) => [node.id, node]));
    return (id) => byId.get(id);
  }, [model]);
  const graph = useMemo(() => toGraph(model, (kind) => t(`changelog-graph.edge.${kind}.label`)), [model, t]);
  const layout = useMemo(() => createLayout(lookup), [lookup]);

  return (
    <NodeLookupContext.Provider value={lookup}>
      <SelectedContext.Provider value={selected}>
        <Graph2DView graph={graph} layout={layout} nodes={nodes}>
          <Legend />
        </Graph2DView>
      </SelectedContext.Provider>
    </NodeLookupContext.Provider>
  );
};
