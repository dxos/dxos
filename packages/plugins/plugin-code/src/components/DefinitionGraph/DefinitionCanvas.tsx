//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { VERDICT_STATUSES, type VerdictStatus } from '@dxos/deus/review';
import {
  type CreateProps,
  DRILL_ANIMATION_MS,
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
import { type DefinitionEdge, type DefinitionGroup, STATUS_STYLE, kindStyle } from '../SpecModel/index.ts';
import {
  CARD,
  type DefinitionScene,
  LATTICE,
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
  // Borderless, so a frame takes no lattice cells and a card can be moved into it.
  style: { border: false },
  fields: { element: frame.element, ...(frame.heading && { heading: frame.heading }) },
});

/** Node views get no host props, so the cards' data reaches them through context. */
const CardContext = createContext<{
  view?: DefinitionViewModel;
  nodes: ReadonlyMap<string, SceneNode>;
  /** How many blocks each block touches; one that touches a single block opens onto nothing new. */
  touches: ReadonlyMap<string, number>;
}>({ nodes: new Map(), touches: new Map() });

/** Whether double-clicking a card opens a level: every cluster, and every block but the focus and the leaves. */
const opensLevel = (card: SceneNode, touches: ReadonlyMap<string, number>) =>
  card.kind === 'cluster' || (!card.focused && (touches.get(card.ref) ?? 0) > 1);

/** The blocks a group names, its anchor first. */
const groupMembers = ({ id, owned, shared, context }: DefinitionGroup) => [id, ...owned, ...shared, ...context];

/** The verdicts of a cluster's blocks, counted, worst last. */
const VerdictCounts = ({ view, groups }: { view: DefinitionViewModel; groups: readonly string[] }) => {
  const counts = useMemo(() => {
    const ids = new Set(
      view.grouping.groups.filter(({ id }) => groups.includes(id)).flatMap((group) => groupMembers(group)),
    );
    const counts = new Map<VerdictStatus, number>();
    for (const id of ids) {
      const status = view.byId.get(id)?.external ? undefined : view.statusOf(id);
      status && counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return VERDICT_STATUSES.flatMap((status) => {
      const count = counts.get(status);
      return count ? [{ status, count }] : [];
    });
  }, [view, groups]);
  return (
    <span className='flex items-center gap-2 text-xs' data-testid='definition-canvas.verdicts'>
      {counts.map(({ status, count }) => (
        <span key={status} className={mx('flex items-center gap-0.5', STATUS_STYLE[status].text)}>
          <Icon.Icon icon={STATUS_STYLE[status].icon} size='xs' label={STATUS_STYLE[status].label} />
          {count}
        </span>
      ))}
    </span>
  );
};

/** The corner mark of a card that opens a level, with how many blocks that level shows around it. */
const OpenMark = ({ count }: { count?: number }) => (
  <span
    className='absolute top-3 end-4 flex items-center gap-0.5 text-xs text-description'
    data-testid='definition-canvas.opens'
  >
    {count !== undefined && count}
    <Icon.Icon icon='ph--arrows-out-simple--regular' size='xs' />
  </span>
);

const CardView = ({ node }: NodeViewProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { view, nodes, touches } = useContext(CardContext);
  const card = nodes.get(node.id);
  if (!view || !card) {
    return null;
  }
  const opens = opensLevel(card, touches);
  if (card.kind === 'cluster') {
    const cluster = view.grouping.clusters.find(({ id }) => id === card.cluster);
    return (
      <div
        className='dx-cover flex flex-col justify-center gap-1.5 px-4 py-3 overflow-hidden rounded-md border border-separator bg-group-surface cursor-zoom-in'
        data-testid='definition-canvas.cluster'
        data-cluster={card.cluster}
      >
        <OpenMark />
        <span className={mx('truncate pe-8 font-medium', cluster?.hub !== undefined && 'font-mono')}>
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
        <VerdictCounts view={view} groups={cluster?.groups ?? []} />
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
        'dx-cover flex flex-col justify-center gap-1.5 px-4 py-3 overflow-hidden rounded-md border bg-base-surface',
        opens && 'cursor-zoom-in',
        card.focused ? 'border-2 border-accent-text' : 'border-separator',
        (definition.external || card.outside) && 'border-dashed',
        card.outside && 'opacity-70',
        change && CHANGE_FRAME[change],
      )}
      data-testid='definition-canvas.card'
      data-definition={card.ref}
      data-focused={card.focused ? '' : undefined}
      data-opens={opens ? '' : undefined}
    >
      {opens && <OpenMark count={touches.get(card.ref)} />}
      <span className='flex items-center gap-1 min-w-0 pe-8'>
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
      <span className='flex gap-1 min-w-0'>
        <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
        {view.factsOf(card.ref).map(({ field, value, style }) => (
          <Tag.Tag key={field} hue={style?.hue} data-testid='definition-canvas.fact' data-field={field}>
            {style && <Icon.Icon icon={style.icon} size='xs' />}
            {value}
          </Tag.Tag>
        ))}
      </span>
    </div>
  );
};

/** Cards that open a level zoom into themselves first; any other card opens nothing. */
const createRegistry = (opens: (id: string) => boolean, open: (id: string) => void) =>
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
        hostOpen: (node) => (opens(node.id) ? () => open(node.id) : undefined),
        hostOpenZoom: true,
        bare: true,
      },
    },
    defaultNodePrototypes,
  );

/** Cards keep the engine's size, and a moved card lands on the lattice the engine's layout lies on. */
const LAYOUT: GraphLayoutOptions = {
  lattice: LATTICE,
  layers: [BACKDROP_LAYER, CARD_LAYER],
  link: { ends: { end: 'arrow' }, layer: CARD_LAYER.id },
};

/** What a canvas level shows: the whole spec, one cluster, or one block and what touches it. */
export type CanvasLevel = { kind: 'spec' } | { kind: 'cluster'; cluster: string } | { kind: 'block'; focus: string };

const levelKey = (level: CanvasLevel) =>
  level.kind === 'spec' ? 'spec' : level.kind === 'cluster' ? level.cluster : level.focus;

/**
 * How a level comes into view: through the card the camera is zooming into, out of the one backed out of, or at once.
 * A level zoomed out of fades while the camera is still moving, and the level it opens comes forward under it.
 */
type Motion = 'enter' | 'return' | 'leave';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const MOTION: Record<Motion, { keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = {
  enter: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.85)' },
      { opacity: 1, transform: 'none' },
    ],
    options: {
      delay: DRILL_ANIMATION_MS * 0.5,
      duration: DRILL_ANIMATION_MS * 0.6,
      easing: 'ease-out',
      fill: 'backwards',
    },
  },
  return: {
    keyframes: [
      { opacity: 0, transform: 'scale(1.08)' },
      { opacity: 1, transform: 'none' },
    ],
    options: { duration: 300, easing: 'ease-out' },
  },
  leave: {
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    options: {
      delay: DRILL_ANIMATION_MS * 0.4,
      duration: DRILL_ANIMATION_MS * 0.5,
      easing: 'ease-in',
      fill: 'forwards',
    },
  },
};

type LevelViewProps = Pick<DefinitionCanvasProps, 'view' | 'edges' | 'level' | 'onOpen' | 'onOpenCluster'> & {
  touches: ReadonlyMap<string, number>;
  motion?: Motion;
  /** Called once a leaving level has faded out. */
  onLeft?: () => void;
};

/** One level on its own canvas, so the level zoomed out of keeps its camera while the next one comes in under it. */
const LevelView = ({ view, edges, level, touches, motion, onLeft, onOpen, onOpenCluster }: LevelViewProps) => {
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

  const callbacks = useRef({ onOpen, onOpenCluster, nodes, touches });
  // After commit, so a render React discards never leaves its callbacks behind.
  useLayoutEffect(() => {
    callbacks.current = { onOpen, onOpenCluster, nodes, touches };
  }, [onOpen, onOpenCluster, nodes, touches]);
  const registry = useMemo(
    () =>
      createRegistry(
        (id) => {
          const card = callbacks.current.nodes.get(id);
          return card !== undefined && opensLevel(card, callbacks.current.touches);
        },
        (id) => {
          const card = callbacks.current.nodes.get(id);
          card?.kind === 'cluster'
            ? callbacks.current.onOpenCluster(card.cluster)
            : card && callbacks.current.onOpen(card.ref);
        },
      ),
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
        return frame ? frameShape(frame) : { type: CARD_TYPE, size: CARD, layer: CARD_LAYER.id };
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
  const context = useMemo(() => ({ view, nodes, touches }), [view, nodes, touches]);

  // Each motion runs to its end: a level that has come in is not jumped back when the level above it has gone.
  const container = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation>(undefined);
  const left = useRef(onLeft);
  left.current = onLeft;
  useLayoutEffect(() => {
    if (!motion) {
      return;
    }
    if (reducedMotion()) {
      motion === 'leave' && left.current?.();
      return;
    }
    const { keyframes, options } = MOTION[motion];
    animation.current?.cancel();
    animation.current = container.current?.animate(keyframes, options);
    if (animation.current && motion === 'leave') {
      animation.current.onfinish = () => left.current?.();
    }
  }, [motion]);
  useLayoutEffect(() => () => animation.current?.cancel(), []);

  return (
    <CardContext.Provider value={context}>
      <div
        ref={container}
        className={mx('dx-cover', motion === 'leave' && 'pointer-events-none')}
        data-testid='definition-canvas.level'
        data-leaving={motion === 'leave' ? '' : undefined}
      >
        <Graph2DView graph={graph} layout={layout} nodes={registry} positions={positions} guides={false} />
      </div>
    </CardContext.Provider>
  );
};

export type DefinitionCanvasProps = {
  view: DefinitionViewModel;
  /** Every edge, mentions included, for the block level. */
  edges: readonly DefinitionEdge[];
  level: CanvasLevel;
  /** How far down the trail the level is, so a level backed out to comes back toward the viewer. */
  depth: number;
  /** Double-clicking a cluster opens it. */
  onOpenCluster: (id: string) => void;
  /** Double-clicking a block opens its level. */
  onOpen: (id: string) => void;
};

/**
 * The definitions on a canvas, one level at a time. The semantic engine places the level's cards and frames and
 * routes its arrows; the canvas draws them, pans and zooms. Double-clicking a cluster opens it, and a block opens
 * what touches it, as the camera zooms into the card.
 */
export const DefinitionCanvas = ({ view, edges, level, depth, onOpenCluster, onOpen }: DefinitionCanvasProps) => {
  const touches = useMemo(() => {
    const neighbours = new Map<string, Set<string>>();
    const add = (from: string, to: string) => neighbours.set(from, (neighbours.get(from) ?? new Set()).add(to));
    for (const { from, to } of edges) {
      add(from, to);
      add(to, from);
    }
    return new Map([...neighbours].map(([id, set]) => [id, set.size]));
  }, [edges]);

  // The level a card was opened from stays on top, zooming and fading, while the opened one comes in under it.
  const [leaving, setLeaving] = useState<CanvasLevel>();
  const shownLevel = useRef(level);
  useLayoutEffect(() => {
    shownLevel.current = level;
  }, [level]);
  const handleOpenCluster = useCallback(
    (id: string) => {
      setLeaving(shownLevel.current);
      onOpenCluster(id);
    },
    [onOpenCluster],
  );
  const handleOpen = useCallback(
    (id: string) => {
      setLeaving(shownLevel.current);
      onOpen(id);
    },
    [onOpen],
  );
  const handleLeft = useCallback(() => setLeaving(undefined), []);
  const key = levelKey(level);
  const outgoing = leaving && levelKey(leaving) !== key ? leaving : undefined;

  // A level backed out to, rather than opened from a card, comes back toward the viewer.
  const [returned, setReturned] = useState<string>();
  const previous = useRef({ key, depth });
  useLayoutEffect(() => {
    const was = previous.current;
    previous.current = { key, depth };
    was.key !== key && setReturned(depth < was.depth ? key : undefined);
  }, [key, depth]);
  const motion: Motion | undefined = outgoing ? 'enter' : returned === key ? 'return' : undefined;

  return (
    <div className='dx-fill relative overflow-hidden' data-testid='definition-canvas' data-level={level.kind}>
      <LevelView
        key={key}
        view={view}
        edges={edges}
        level={level}
        touches={touches}
        motion={motion}
        onOpen={handleOpen}
        onOpenCluster={handleOpenCluster}
      />
      {outgoing && (
        <LevelView
          key={levelKey(outgoing)}
          view={view}
          edges={edges}
          level={outgoing}
          touches={touches}
          motion='leave'
          onLeft={handleLeft}
          onOpen={handleOpen}
          onOpenCluster={handleOpenCluster}
        />
      )}
    </div>
  );
};
