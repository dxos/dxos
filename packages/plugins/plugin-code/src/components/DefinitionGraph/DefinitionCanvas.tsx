//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useContext, useLayoutEffect, useMemo, useRef } from 'react';

import {
  type CreateProps,
  type GraphLayoutOptions,
  type GraphModel,
  type GraphShape,
  type NodeViewProps,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
} from '@dxos/react-ui-canvas';
import { Graph2DView } from '@dxos/react-ui-canvas-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Tag from '@dxos/react-ui/Tag';
import { type Layer, type Node, nodeBase } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { type DefinitionEdge, STATUS_STYLE, kindStyle } from '../SpecModel/index.ts';
import {
  CARD,
  type DefinitionScene,
  PITCH,
  type PlacedFrame,
  type SceneNode,
  blockScene,
  clusterScene,
  placeScene,
  specScene,
} from './definition-scenes.ts';
import { CHANGE_FRAME, type DefinitionViewModel } from './DefinitionChip.tsx';

const CARD_TYPE = 'definition-card';

const CardNode = Schema.Struct({ type: Schema.Literal(CARD_TYPE), ...nodeBase });

const createCardNode = (props: CreateProps): Node => ({ type: CARD_TYPE, ...props });

/** Frames sit on a layer under the cards and arrows, as the illustrator draws them. */
const BACKDROP_LAYER: Layer = { id: 'backdrop', name: 'Frames', z: 'a0' };
const CARD_LAYER: Layer = { id: 'cards', name: 'Definitions', z: 'a1' };

/** A frame as the canvas's own diagram shape: the illustrator's tinted box and title, locked in place. */
const frameShape = (frame: PlacedFrame): GraphShape => ({
  type: 'diagram',
  size: frame.size,
  label: frame.label,
  layer: BACKDROP_LAYER.id,
  locked: true,
  fields: { element: frame.element, ...(frame.heading && { heading: frame.heading }) },
});

/** Node views get no host props, so the cards' data reaches them through context. */
const CardContext = createContext<{ view?: DefinitionViewModel; nodes: ReadonlyMap<string, SceneNode> }>({
  nodes: new Map(),
});

const CardView = ({ node }: NodeViewProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { view, nodes } = useContext(CardContext);
  const card = nodes.get(node.id);
  if (!view || !card) {
    return null;
  }
  if (card.kind === 'cluster') {
    const cluster = view.grouping.clusters.find(({ id }) => id === card.cluster);
    return (
      <div
        className='dx-cover flex flex-col justify-center gap-1 px-3 rounded-md border border-separator bg-group-surface'
        data-testid='definition-canvas.cluster'
        data-cluster={card.cluster}
      >
        <span className={mx('truncate font-medium', cluster?.hub !== undefined && 'font-mono')}>
          {cluster?.hub === undefined
            ? t('definition-map.cluster.unshared.label')
            : t('definition-map.cluster.label', { hub: cluster.hub })}
        </span>
        <span className='flex gap-1'>
          <Tag.Tag>{t('definition-map.groups.label', { count: cluster?.groups.length ?? 0 })}</Tag.Tag>
          {(cluster?.shared.length ?? 0) > 0 && (
            <Tag.Tag>{t('definition-map.shares.label', { count: cluster?.shared.length })}</Tag.Tag>
          )}
        </span>
      </div>
    );
  }
  const definition = view.byId.get(card.ref);
  if (!definition) {
    return null;
  }
  const { icon, hue } = kindStyle(definition.kind);
  const status = definition.external ? undefined : view.statusOf(card.ref);
  const change = view.changeOf(card.ref);
  const title = definition.title && definition.title !== card.ref ? definition.title : undefined;
  return (
    <div
      className={mx(
        'dx-cover flex flex-col justify-center gap-0.5 px-3 rounded-md border bg-base-surface',
        card.focused ? 'border-2 border-accent-text' : 'border-separator',
        (definition.external || card.outside) && 'border-dashed',
        card.outside && 'opacity-70',
        change && CHANGE_FRAME[change],
      )}
      data-testid='definition-canvas.card'
      data-definition={card.ref}
      data-focused={card.focused ? '' : undefined}
    >
      <span className='flex items-center gap-1 min-w-0'>
        <Icon.Icon icon={icon} size='xs' classNames='shrink-0' />
        <span className='truncate font-mono text-sm'>{definition.external?.fragment ?? card.ref}</span>
        {(card.count ?? 0) > 1 && <span className='shrink-0 text-xs text-description'>×{card.count}</span>}
        {status && (
          <Icon.Icon
            icon={STATUS_STYLE[status].icon}
            size='xs'
            classNames={mx('shrink-0', STATUS_STYLE[status].text)}
          />
        )}
      </span>
      {title && <span className='truncate text-xs text-description'>{title}</span>}
      <span className='flex'>
        <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
      </span>
    </div>
  );
};

const createRegistry = (open: (id: string) => void) =>
  createNodeRegistry(
    {
      ...defaultNodeTypes,
      [CARD_TYPE]: {
        name: 'Definition',
        icon: 'ph--cube--regular',
        schema: CardNode,
        component: CardView,
        create: createCardNode,
        defaultSize: { width: 3, height: 1 },
        resizable: false,
        palette: false,
        portsPerSide: 1,
        openable: true,
        hostOpen: (node) => () => open(node.id),
        bare: true,
      },
    },
    defaultNodePrototypes,
  );

/** Cards and pitch match the engine's, so its positions land on cards the same size. */
const LAYOUT: GraphLayoutOptions = {
  size: CARD,
  pitch: PITCH,
  layers: [BACKDROP_LAYER, CARD_LAYER],
  link: { ends: { end: 'arrow' }, layer: CARD_LAYER.id },
};

/** What a canvas level shows: the whole spec, one cluster, or one block and what touches it. */
export type CanvasLevel = { kind: 'spec' } | { kind: 'cluster'; cluster: string } | { kind: 'block'; focus: string };

export type DefinitionCanvasProps = {
  view: DefinitionViewModel;
  /** Every edge, mentions included, for the block level. */
  edges: readonly DefinitionEdge[];
  level: CanvasLevel;
  /** Double-clicking a cluster opens it. */
  onOpenCluster: (id: string) => void;
  /** Double-clicking a block opens its level. */
  onOpen: (id: string) => void;
};

/**
 * The definitions on a canvas, one level at a time. The semantic engine places the level's cards and frames and
 * routes its arrows; the canvas draws them, pans and zooms. Double-clicking a cluster opens it, and a block opens
 * what touches it.
 */
export const DefinitionCanvas = ({ view, edges, level, onOpenCluster, onOpen }: DefinitionCanvasProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const scene = useMemo<DefinitionScene>(() => {
    switch (level.kind) {
      case 'spec':
        return specScene(view.grouping);
      case 'cluster':
        return clusterScene(view.grouping, level.cluster, { buildsOn: t('definition-canvas.builds-on.label') });
      case 'block':
        return blockScene(view.byId, view.grouping, edges, level.focus, {
          above: t('definition-canvas.above.label'),
          below: t('definition-canvas.below.label'),
          checks: t('definition-canvas.checks.label'),
        });
    }
  }, [view, edges, level, t]);
  const placed = useMemo(() => placeScene(scene), [scene]);
  const nodes = useMemo(() => new Map(scene.nodes.map((node) => [node.id, node])), [scene]);

  const callbacks = useRef({ onOpen, onOpenCluster, nodes });
  // After commit, so a render React discards never leaves its callbacks behind.
  useLayoutEffect(() => {
    callbacks.current = { onOpen, onOpenCluster, nodes };
  }, [onOpen, onOpenCluster, nodes]);
  const registry = useMemo(
    () =>
      createRegistry((id) => {
        const card = callbacks.current.nodes.get(id);
        if (card?.kind === 'cluster') {
          callbacks.current.onOpenCluster(card.cluster);
        } else if (card) {
          callbacks.current.onOpen(card.ref);
        }
      }),
    [],
  );

  const graph = useMemo<GraphModel>(
    () => ({
      // Frames first, so they paint under the cards.
      nodes: [
        ...placed.frames.map(({ id, label }) => ({ id, label })),
        ...scene.nodes.map(({ id }) => ({ id, label: id })),
      ],
      edges: scene.edges.map(({ id, from, to, label, dashed, both }) => ({
        id,
        from,
        to,
        ...(label && { text: label }),
        // Drawn as the illustrator draws a connector, along the engine's route, with its own markers and dash.
        connector: {
          head: 'arrow' as const,
          ...(both && { tail: 'arrow' as const }),
          ...(dashed && { stroke: 'dashed' as const }),
          ...(placed.routes[id] && { route: placed.routes[id] }),
        },
      })),
    }),
    [scene, placed],
  );
  const layout = useMemo<GraphLayoutOptions>(() => {
    const frames = new Map(placed.frames.map((frame) => [frame.id, frame]));
    return {
      ...LAYOUT,
      shape: (node) => {
        const frame = frames.get(node.id);
        return frame ? frameShape(frame) : { type: CARD_TYPE, layer: CARD_LAYER.id };
      },
    };
  }, [placed]);
  const positions = useMemo(
    () => ({
      ...placed.positions,
      ...Object.fromEntries(placed.frames.map(({ id, center }) => [id, center])),
    }),
    [placed],
  );
  const context = useMemo(() => ({ view, nodes }), [view, nodes]);
  const levelKey = level.kind === 'spec' ? 'spec' : level.kind === 'cluster' ? level.cluster : level.focus;

  return (
    <CardContext.Provider value={context}>
      <div className='dx-fill relative' data-testid='definition-canvas' data-level={level.kind}>
        <Graph2DView key={levelKey} graph={graph} layout={layout} nodes={registry} positions={positions} />
      </div>
    </CardContext.Provider>
  );
};
