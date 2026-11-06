//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { VERDICT_STATUSES, type VerdictStatus } from '@dxos/deus/review';
import {
  type CreateProps,
  type NodeViewProps,
  ViewNodeView,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  diagramSetDocument,
} from '@dxos/react-ui-canvas';
import { Document2DView } from '@dxos/react-ui-canvas-editor';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Tag from '@dxos/react-ui/Tag';
import { type Node, type Scene, nodeBase } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import {
  type DefinitionEdge,
  type DefinitionGroup,
  type DefinitionModel,
  STATUS_STYLE,
  kindStyle,
} from '../SpecModel/index.ts';
import {
  type CompiledLevels,
  type DefinitionLevelsOptions,
  LATTICE,
  type SceneNode,
  blockScene,
  cardKey,
  clusterScene,
  compileBlock,
  definitionLevels,
  onLattice,
  specScene,
} from './definition-scenes.ts';
import { CHANGE_FRAME, type DefinitionViewModel } from './DefinitionChip.tsx';

const CARD_TYPE = 'definition-card';

/** How long one slice of laying out block levels holds the thread. */
const LAYOUT_SLICE_MS = 30;

/** The card a node draws, by its level and box (`cardKey`); a drilled box keeps it as it becomes a frame. */
const CardFields = Schema.Struct({ card: Schema.String });
const isCard = Schema.is(CardFields);

const CardNode = Schema.Struct({ type: Schema.Literal(CARD_TYPE), ...nodeBase });

const createCardNode = (props: CreateProps): Node => ({ type: CARD_TYPE, ...props });

/** Node views get no host props, so the cards' data reaches them through context. */
const CardContext = createContext<{
  view?: DefinitionViewModel;
  cards: ReadonlyMap<string, SceneNode>;
  /** How many blocks each block touches, which its level shows around it. */
  touches: ReadonlyMap<string, number>;
}>({ cards: new Map(), touches: new Map() });

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
  <span className='flex shrink-0 items-center gap-0.5 text-xs text-description' data-testid='definition-canvas.opens'>
    {count !== undefined && count}
    <Icon.Icon icon='ph--arrows-out-simple--regular' size='xs' />
  </span>
);

const CARD_ROOT = 'dx-cover justify-between gap-1 overflow-hidden';

/** A card's face: the header row (icon, name, verdict and open mark), its description, and its tags at the foot. */
const CardFace = ({ card, opens }: { card: SceneNode; opens: boolean }) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { view, touches } = useContext(CardContext);
  if (!view) {
    return null;
  }
  if (card.kind === 'cluster') {
    const cluster = view.grouping.clusters.find(({ id }) => id === card.cluster);
    return (
      <Card.Root
        classNames={mx(CARD_ROOT, 'cursor-zoom-in')}
        data-testid='definition-canvas.cluster'
        data-cluster={card.cluster}
      >
        <Card.Header>
          <Icon.Icon icon='ph--circles-three--regular' size='xs' classNames='shrink-0' />
          <Card.Title truncate classNames={mx(cluster?.hub !== undefined && 'font-mono')}>
            {cluster?.hub === undefined
              ? t('definition-map.cluster.unshared.label')
              : t('definition-map.cluster.label', { hub: cluster.hub })}
          </Card.Title>
          <OpenMark />
        </Card.Header>
        <VerdictCounts view={view} groups={cluster?.groups ?? []} />
        <Card.Footer justify='start'>
          <Tag.Tag>{t('definition-map.groups.label', { count: cluster?.groups.length ?? 0 })}</Tag.Tag>
          {(cluster?.shared.length ?? 0) > 0 && (
            <Tag.Tag>{t('definition-map.shares.label', { count: cluster?.shared.length })}</Tag.Tag>
          )}
        </Card.Footer>
      </Card.Root>
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
    <Card.Root
      classNames={mx(
        CARD_ROOT,
        opens && 'cursor-zoom-in',
        card.focused && 'border-2 border-accent-text',
        (definition.external || card.outside) && 'border-dashed',
        card.outside && 'opacity-70',
        change && CHANGE_FRAME[change],
      )}
      data-testid='definition-canvas.card'
      data-definition={card.ref}
      data-focused={card.focused ? '' : undefined}
      data-opens={opens ? '' : undefined}
    >
      <Card.Header>
        <Icon.Icon icon={icon} size='xs' classNames='shrink-0' />
        <Card.Title truncate classNames='font-mono text-sm'>
          {definition.external?.fragment ?? card.ref}
        </Card.Title>
        {(card.count ?? 0) > 1 && <span className='shrink-0 text-xs text-description'>×{card.count}</span>}
        {status && (
          <Icon.Icon
            icon={STATUS_STYLE[status].icon}
            size='xs'
            label={STATUS_STYLE[status].label}
            classNames={mx('shrink-0', STATUS_STYLE[status].text)}
          />
        )}
        {opens && <OpenMark count={touches.get(card.ref)} />}
      </Card.Header>
      {title && <Card.Description classNames='truncate'>{title}</Card.Description>}
      <Card.Footer justify='start' classNames='overflow-hidden'>
        <Tag.Tag hue={hue}>{definition.kind}</Tag.Tag>
        {view.factsOf(card.ref).map(({ field, value, style }) => (
          <Tag.Tag key={field} hue={style?.hue} data-testid='definition-canvas.fact' data-field={field}>
            {style && <Icon.Icon icon={style.icon} size='xs' />}
            {value}
          </Tag.Tag>
        ))}
      </Card.Footer>
    </Card.Root>
  );
};

const useCard = (node: Node) => {
  const { cards } = useContext(CardContext);
  return isCard(node) ? cards.get(node.card) : undefined;
};

/** A block that opens nothing. */
const CardView = ({ node }: NodeViewProps) => {
  const card = useCard(node);
  return card ? <CardFace card={card} opens={false} /> : null;
};

/** A card that drills into its level: its face until it opens, then the level drawn inside it as the camera zooms. */
const DrillView = (props: NodeViewProps) => {
  const card = useCard(props.node);
  return card && !props.opening ? <CardFace card={card} opens /> : <ViewNodeView {...props} />;
};

/** Double-clicking a block of another spec opens it; every other card drills, or opens nothing. */
const createRegistry = (open: (node: Node) => (() => void) | undefined) =>
  createNodeRegistry(
    {
      ...defaultNodeTypes,
      view: { ...defaultNodeTypes.view, component: DrillView, bare: true },
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
        hostOpen: open,
        bare: true,
      },
    },
    defaultNodePrototypes,
  );

export type DefinitionCanvasProps = {
  view: DefinitionViewModel;
  /** Every edge, mentions included, for the block levels. */
  edges: readonly DefinitionEdge[];
  /** Double-clicking a block of another spec opens it. */
  onActivate?: (definition: DefinitionModel) => void;
};

/**
 * The definitions on a canvas, as nested diagrams: the clusters, each drilling into its groups, whose blocks drill
 * into what touches them. The semantic engine lays out every level; the canvas draws them and zooms into a card to
 * open its level, as it drills into any diagram's frame.
 */
export const DefinitionCanvas = ({ view, edges, onActivate }: DefinitionCanvasProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const touches = useMemo(() => {
    const neighbours = new Map<string, Set<string>>();
    const add = (from: string, to: string) => neighbours.set(from, (neighbours.get(from) ?? new Set()).add(to));
    for (const { from, to } of edges) {
      add(from, to);
      add(to, from);
    }
    return new Map([...neighbours].map(([id, set]) => [id, set.size]));
  }, [edges]);

  const options = useMemo<DefinitionLevelsOptions>(() => {
    const clusterName = (id: string) => {
      const hub = view.grouping.clusters.find((cluster) => cluster.id === id)?.hub;
      return hub === undefined
        ? t('definition-map.cluster.unshared.label')
        : t('definition-map.cluster.label', { hub });
    };
    return {
      spec: { name: t('definition-graph.crumb.spec.label'), scene: specScene(view.grouping) },
      cluster: (id) => ({
        name: clusterName(id),
        scene: clusterScene(view.grouping, edges, id, { buildsOn: t('definition-canvas.builds-on.label') }),
      }),
      block: (ref) => ({
        name: ref,
        scene: blockScene(view.byId, edges, ref, {
          above: t('definition-canvas.above.label'),
          below: t('definition-canvas.below.label'),
          checks: t('definition-canvas.checks.label'),
        }),
      }),
      // A block that touches a single block opens onto nothing new.
      opens: (card) => !card.outside && !view.byId.get(card.ref)?.external && (touches.get(card.ref) ?? 0) > 1,
    };
  }, [view, edges, touches, t]);

  // The block levels are laid out after the canvas opens, a few at a time, and drilled into once all are done.
  const [laidOut, setLaidOut] = useState<{ options: DefinitionLevelsOptions; compiled: CompiledLevels }>();
  const levels = useMemo(
    () => definitionLevels(options, laidOut?.options === options ? laidOut.compiled : undefined),
    [options, laidOut],
  );
  useEffect(() => {
    const queue = [...levels.pending];
    if (queue.length === 0) {
      return;
    }
    const compiled = new Map(levels.compiled);
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const started = performance.now();
      for (let ref = queue.shift(); ref !== undefined; ref = queue.shift()) {
        compiled.set(...compileBlock(options, ref));
        if (performance.now() - started > LAYOUT_SLICE_MS) {
          break;
        }
      }
      queue.length > 0 ? (timer = setTimeout(step)) : setLaidOut({ options, compiled });
    };
    timer = setTimeout(step);
    return () => clearTimeout(timer);
  }, [options, levels]);

  const { cards } = levels;
  const document = useMemo<Scene.SceneDocument>(() => {
    const { set, labels } = levels;
    const document = diagramSetDocument(set, {
      node: (diagram, node) => {
        const key = cardKey(diagram, node.id);
        return cards.has(key) ? { ...node, type: CARD_TYPE, card: key, center: onLattice(node.center) } : node;
      },
      link: (diagram, link) => {
        const text = labels.get(cardKey(diagram, link.id));
        return text ? { ...link, text } : link;
      },
    });
    // Every level snaps a moved card to the lattice the engine laid it out on.
    return {
      ...document,
      layouts: document.layouts.map((layout) => (layout.dim === '2d' ? { ...layout, lattice: LATTICE } : layout)),
    };
  }, [levels, cards]);
  const context = useMemo(() => ({ view, cards, touches }), [view, cards, touches]);

  const latest = useRef({ view, cards, onActivate });
  // After commit, so a render React discards never leaves its callbacks behind.
  useLayoutEffect(() => {
    latest.current = { view, cards, onActivate };
  }, [view, cards, onActivate]);
  const registry = useMemo(
    () =>
      createRegistry((node) => {
        const { view, cards, onActivate } = latest.current;
        const card = isCard(node) ? cards.get(node.card) : undefined;
        const definition = card?.kind === 'definition' ? view.byId.get(card.ref) : undefined;
        return definition?.external && onActivate ? () => onActivate(definition) : undefined;
      }),
    [],
  );

  return (
    <CardContext.Provider value={context}>
      <div className='dx-fill relative overflow-hidden' data-testid='definition-canvas'>
        <Document2DView document={document} nodes={registry} guides={false} />
      </div>
    </CardContext.Provider>
  );
};
