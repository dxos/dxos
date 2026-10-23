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
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { CodeIndexClient } from '#client';
import { type Fact, NodeDetails } from '#components';
import { Semantic } from '#graph';
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

const isLayout = (value: string): value is CodeGraph.Layout => LAYOUTS.some((layout) => layout.value === value);

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

export const CodeGraphArticle = ({ role, subject }: CodeGraphArticleProps) => {
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
    (value: string) => {
      if (isLayout(value)) {
        Obj.update(subject, (subject) => {
          subject.layout = value;
        });
      }
    },
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

  const [selected, setSelected] = useState<string>();
  const selectedNode = useMemo(() => nodes.find(({ id }) => id === selected), [nodes, selected]);
  const details = useInspect(selected);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.ToggleGroup type='single' value={layout} onValueChange={handleLayoutChange}>
            {LAYOUTS.map(({ value, icon }) => (
              <ToggleGroup.Item key={value} value={value} icon={icon} iconOnly label={t(`layout-${value}.label`)} />
            ))}
          </Toolbar.ToggleGroup>
          <Button.Root
            icon='ph--arrow-counter-clockwise--regular'
            iconOnly
            label={t('reset-positions.label')}
            disabled={Object.keys(dragged).length === 0}
            onClick={handleResetPositions}
          />
          {semantic.pending && <span className='text-sm text-description'>{t('layout-running.label')}</span>}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <div className='relative dx-cover' data-testid='code-graph-article'>
          {nodes.length === 0 ? (
            <div className='dx-cover grid place-items-center text-description'>{t('empty.message')}</div>
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
              selected={selected}
              onOpen={setSelected}
              onRemove={handleRemove}
              // Reframe when boxes come or go, and when the illustrator's positions land after the first frame.
              refitKey={`${nodes.length}:${layout === 'illustrator' ? semantic.key : ''}`}
            />
          )}
          {selectedNode && (
            <NodeDetails
              node={selectedNode}
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

/** The selected resource's facts from the index. */
const useInspect = (iri: string | undefined) => {
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
    const fiber = Effect.runFork(
      CodeIndexClient.describe(iri, 40).pipe(
        Effect.match({
          onSuccess: (result) => ({
            facts: [...(result.outgoing ?? [])],
            incoming: [...(result.incomingCounts ?? [])],
          }),
          onFailure: (error) => ({ error: error.message }),
        }),
        Effect.tap((next) => Effect.sync(() => setState(next))),
      ),
    );
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [iri]);
  return state;
};
