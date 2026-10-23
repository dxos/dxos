//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { type Fact, NodeDetails } from '#components';
import { Kind, Semantic } from '#graph';
import { meta } from '#meta';
import { CodeGraph, CodeGraphOperation } from '#types';

// Imported directly rather than through the barrel: the canvas engine and the illustrator renderer are large.
import { CodeGraphCanvas } from '../../components/CodeGraphCanvas/index.ts';
import { CodeGraphDiagram } from '../../components/CodeGraphDiagram/index.ts';

type Point = Semantic.Point;

const LAYOUTS: { value: CodeGraph.Layout; icon: string }[] = [
  { value: 'illustrator', icon: 'ph--squares-four--regular' },
  { value: 'force', icon: 'ph--graph--regular' },
  { value: 'rank', icon: 'ph--tree-structure--regular' },
  { value: 'diagram', icon: 'ph--pencil-simple--regular' },
];

const EMPTY: Semantic.Layout = { positions: {}, objects: [], problems: [] };

/**
 * The illustrator's layout of the graph. The engine is synchronous and takes up to seconds, so it runs after the
 * frame that changed the graph has painted, and only for the layouts that read it.
 */
const useSemanticLayout = (
  nodes: readonly CodeGraph.Node[],
  edges: readonly CodeGraph.Edge[],
  enabled: boolean,
): { layout: Semantic.Layout; pending: boolean; key?: string } => {
  // Keyed on structure, not positions: dragging a box must not re-run the engine.
  const key = useMemo(
    () =>
      JSON.stringify([
        nodes.map(({ id, label, group }) => [id, label, group]),
        edges.map(({ from, to, kind }) => [from, to, kind]),
      ]),
    [nodes, edges],
  );
  const [state, setState] = useState<{ key?: string; layout: Semantic.Layout }>({ layout: EMPTY });
  useEffect(() => {
    if (!enabled || state.key === key) {
      return;
    }
    const fiber = Effect.runFork(
      Effect.sleep('16 millis').pipe(
        Effect.andThen(Effect.sync(() => Semantic.layout({ nodes: [...nodes], edges: [...edges] }))),
        Effect.tap((layout) => Effect.sync(() => setState({ key, layout }))),
      ),
    );
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [enabled, key]);
  return { layout: state.layout, pending: enabled && state.key !== key, key: state.key };
};

export type CodeGraphArticleProps = AppSurface.ObjectArticleProps<CodeGraph.CodeGraph>;

export const CodeGraphArticle = ({ role, subject, attendableId }: CodeGraphArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const [graph] = useObject(subject);
  const { invokePromise } = Hooks.useOperationInvoker();
  const layout = graph.layout ?? 'illustrator';
  const nodes = graph.nodes;
  const edges = graph.edges;

  const semantic = useSemanticLayout(nodes, edges, layout === 'illustrator' || layout === 'diagram');

  // Where the user dragged boxes; the rest are placed by the layout.
  const dragged = useMemo(
    () =>
      Object.fromEntries(
        nodes.flatMap(({ id, position }): [string, Point][] =>
          position ? [[id, { x: position.x, y: position.y }]] : [],
        ),
      ),
    [nodes],
  );
  const computed = layout === 'illustrator' ? semantic.layout.positions : {};
  const positions = useMemo(() => ({ ...computed, ...dragged }), [computed, dragged]);

  const handlePositionsChange = useCallback(
    (next: Record<string, Point>) => {
      const moved = Object.entries(next).filter(([id, point]) => {
        const current = positions[id];
        return !current || current.x !== point.x || current.y !== point.y;
      });
      if (moved.length > 0) {
        const byId = new Map(moved);
        Obj.update(subject, (subject) => {
          for (const node of subject.nodes) {
            const point = byId.get(node.id);
            if (point) {
              node.position = { x: point.x, y: point.y };
            }
          }
        });
      }
    },
    [subject, positions],
  );

  const handleLayoutChange = useCallback(
    (value: CodeGraph.Layout) =>
      Obj.update(subject, (subject) => {
        subject.layout = value;
      }),
    [subject],
  );

  const spaceId = Obj.getDatabase(subject)?.spaceId;
  const handleResetPositions = useCallback(
    () =>
      void invokePromise(
        CodeGraphOperation.SetLayout,
        { graph: Ref.make(subject), layout, resetPositions: true },
        { spaceId },
      ),
    [invokePromise, subject, layout, spaceId],
  );

  const handleRemove = useCallback(
    (ids: string[]) =>
      void invokePromise(CodeGraphOperation.Remove, { graph: Ref.make(subject), nodes: ids }, { spaceId }),
    [invokePromise, subject, spaceId],
  );

  const handleExpand = useCallback(
    (id: string, direction: 'out' | 'in') =>
      void invokePromise(
        CodeGraphOperation.AddNeighbors,
        { graph: Ref.make(subject), nodes: [id], direction },
        { spaceId },
      ),
    [invokePromise, subject, spaceId],
  );

  const kinds = useKinds(nodes, invokePromise);
  const [selected, setSelected] = useState<string>();
  const selectedNode = useMemo(() => nodes.find(({ id }) => id === selected), [nodes, selected]);
  const details = useInspect(selected, invokePromise);

  // The same panel as a hover card; it fetches its facts only once the card opens.
  const renderPreview = useCallback(
    (id: string) => {
      const node = nodes.find((candidate) => candidate.id === id);
      return (
        node && (
          <NodePreview
            node={node}
            kind={kinds[id]}
            invokePromise={invokePromise}
            onExpand={(direction) => handleExpand(id, direction)}
            onRemove={() => handleRemove([id])}
          />
        )
      );
    },
    [nodes, kinds, invokePromise, handleExpand, handleRemove],
  );
  const actions = useToolbarActions({
    layout,
    pending: semantic.pending,
    hasDragged: Object.keys(dragged).length > 0,
    onLayoutChange: handleLayoutChange,
    onResetPositions: handleResetPositions,
  });

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...actions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        {/* Positioned rather than a layout box: the details panel floats over the canvas, anchored to this frame. */}
        <div className='relative dx-cover' data-testid='code-graph-article'>
          {nodes.length === 0 ? (
            <Layout.Flex center classNames='dx-cover text-description'>
              {t('empty.message')}
            </Layout.Flex>
          ) : layout === 'diagram' ? (
            <CodeGraphDiagram objects={semantic.layout.objects} selected={selected} onSelect={setSelected} />
          ) : (
            // Remounted per layout: the canvas builds its projection once, and an arrangement change must re-run it.
            <CodeGraphCanvas
              key={layout}
              nodes={nodes}
              edges={edges}
              arrange={layout === 'force' ? 'force' : 'crossings'}
              positions={positions}
              onPositionsChange={handlePositionsChange}
              kinds={kinds}
              selected={selected}
              renderPreview={renderPreview}
              onOpen={setSelected}
              onRemove={handleRemove}
              // Reframe when boxes come or go, and when the illustrator's positions land after the first frame.
              refitKey={`${nodes.length}:${layout === 'illustrator' ? semantic.key : ''}`}
            />
          )}
          {selectedNode && (
            <NodeDetails
              classNames='absolute top-2 right-2 bottom-2 w-96'
              node={selectedNode}
              kind={kinds[selectedNode.id]}
              facts={details.facts}
              incoming={details.incoming}
              error={details.error}
              onExpand={(direction) => handleExpand(selectedNode.id, direction)}
              onRemove={() => {
                handleRemove([selectedNode.id]);
                setSelected(undefined);
              }}
              onClose={() => setSelected(undefined)}
            />
          )}
        </div>
      </Panel.Body>
    </Panel.Root>
  );
};

export default CodeGraphArticle;

type Invoke = ReturnType<typeof Hooks.useOperationInvoker>['invokePromise'];

/** The layout toggle and the reset action, as menu actions so plugins and shortcuts compose with them. */
const useToolbarActions = ({
  layout,
  pending,
  hasDragged,
  onLayoutChange,
  onResetPositions,
}: {
  layout: CodeGraph.Layout;
  pending: boolean;
  hasDragged: boolean;
  onLayoutChange: (layout: CodeGraph.Layout) => void;
  onResetPositions: () => void;
}) =>
  useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'layout',
          {
            label: ['layout.label', { ns: meta.profile.key }],
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: layout,
          },
          (group) => {
            for (const { value, icon } of LAYOUTS) {
              group.action(
                value,
                { label: [`layout-${value}.label`, { ns: meta.profile.key }], icon, iconOnly: true },
                () => onLayoutChange(value),
              );
            }
          },
        )
        .action(
          'reset-positions',
          {
            label: ['reset-positions.label', { ns: meta.profile.key }],
            // Spins while the illustrator lays the graph out, the one wait this view has.
            icon: pending ? 'ph--spinner--regular' : 'ph--arrow-counter-clockwise--regular',
            spin: pending,
            iconOnly: true,
            disabled: !hasDragged,
          },
          onResetPositions,
        )
        .build(),
    [layout, pending, hasDragged, onLayoutChange, onResetPositions],
  );

/** The selected resource's facts from the index, through the Inspect operation. */
const useInspect = (iri: string | undefined, invokePromise: Invoke) => {
  const [state, setState] = useState<{
    facts?: Fact[];
    incoming?: { predicate: string; count: number }[];
    error?: string;
  }>({});
  useEffect(() => {
    setState({});
    if (!iri) {
      return;
    }
    let cancelled = false;
    void invokePromise(CodeGraphOperation.Inspect, { target: iri, limit: 40 }).then(({ data, error }) => {
      if (!cancelled) {
        setState(data ? { facts: [...data.outgoing], incoming: [...data.incomingCounts] } : { error: error?.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [iri, invokePromise]);
  return state;
};

/** The details panel inside a hover card, with its own facts. */
const NodePreview = ({
  node,
  kind,
  invokePromise,
  onExpand,
  onRemove,
}: {
  node: CodeGraph.Node;
  kind?: string;
  invokePromise: Invoke;
  onExpand: (direction: 'out' | 'in') => void;
  onRemove: () => void;
}) => {
  const details = useInspect(node.id, invokePromise);
  return (
    <NodeDetails
      classNames='w-96 max-h-[32rem]'
      node={node}
      kind={kind}
      facts={details.facts}
      incoming={details.incoming}
      error={details.error}
      onExpand={onExpand}
      onRemove={onRemove}
    />
  );
};

/**
 * What each box is, from one index query over the whole graph: re-run only when the set of boxes changes, and
 * empty when the index cannot answer, so boxes fall back to their coarse kind.
 */
const useKinds = (nodes: readonly CodeGraph.Node[], invokePromise: Invoke): Record<string, string> => {
  const ids = useMemo(
    () =>
      nodes
        .map(({ id }) => id)
        .sort()
        .join('\n'),
    [nodes],
  );
  const [kinds, setKinds] = useState<Record<string, string>>({});
  useEffect(() => {
    const sparql = Kind.query(nodes.map(({ id }) => id));
    if (!sparql) {
      return;
    }
    let cancelled = false;
    void invokePromise(CodeGraphOperation.Query, { sparql, limit: 2000 }).then(({ data }) => {
      if (!cancelled && data) {
        setKinds(Kind.fromRows(nodes, data.rows));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ids, invokePromise]);
  return kinds;
};
