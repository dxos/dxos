//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { Grounding } from '#command';
import { CommandBar, type CommandOutcome, type Fact, NodeDetails } from '#components';
import { Kind, Semantic } from '#graph';
import { CodeGraph, CodeGraphOperation } from '#types';

// Imported directly rather than through the barrel: the canvas engine and the illustrator renderer are large.
import { CodeGraphCanvas, framePositions } from '../../components/CodeGraphCanvas/index.ts';
import { CodeGraphDiagram } from '../../components/CodeGraphDiagram/index.ts';
import { CodeGraphNamespace } from '../../namespace.ts';
import { useSpeechCommand } from './useSpeechCommand.ts';

type Point = Semantic.Point;

const LAYOUTS: { value: CodeGraph.Layout; icon: string }[] = [
  { value: 'illustrator', icon: 'ph--squares-four--regular' },
  { value: 'force', icon: 'ph--graph--regular' },
  { value: 'rank', icon: 'ph--tree-structure--regular' },
  { value: 'diagram', icon: 'ph--pencil-simple--regular' },
];

const NO_FRAMES: readonly Semantic.Frame[] = [];

const EMPTY: Semantic.Layout = { positions: {}, frames: [], objects: [], problems: [] };

/**
 * The illustrator's layout of the graph. The engine is synchronous and takes up to seconds, so it runs after the
 * frame that changed the graph has painted, and only for the layouts that read it.
 */
const useSemanticLayout = (
  nodes: readonly CodeGraph.Node[],
  edges: readonly CodeGraph.Edge[],
  { enabled, grouped, labels }: { enabled: boolean; grouped: boolean; labels: Record<string, string> },
): { layout: Semantic.Layout; pending: boolean; key?: string } => {
  // Keyed on structure, not positions: dragging a box must not re-run the engine.
  const key = useMemo(
    () =>
      JSON.stringify([
        grouped,
        labels,
        nodes.map(({ id, label, group }) => [id, label, group]),
        edges.map(({ from, to, kind }) => [from, to, kind]),
      ]),
    [nodes, edges, grouped, labels],
  );
  const [state, setState] = useState<{ key?: string; layout: Semantic.Layout }>({ layout: EMPTY });
  useEffect(() => {
    if (!enabled || state.key === key) {
      return;
    }
    const fiber = Effect.runFork(
      Effect.sleep('16 millis').pipe(
        Effect.andThen(
          Effect.sync(() => Semantic.layout({ nodes: [...nodes], edges: [...edges] }, { grouped, labels })),
        ),
        Effect.tap((layout) => Effect.sync(() => setState({ key, layout }))),
      ),
    );
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [enabled, key]);
  return { layout: state.layout, pending: enabled && state.key !== key, key: state.key };
};

export type CodeGraphArticleProps = AppSurface.ObjectArticleProps<CodeGraph.CodeGraph>;

export const CodeGraphArticle = ({ role, subject, attendableId }: CodeGraphArticleProps) => {
  const { t } = UiHooks.useTranslation(CodeGraphNamespace.key);
  const [graph] = useObject(subject);
  const { invokePromise } = Hooks.useOperationInvoker();
  const layout = graph.layout ?? 'illustrator';
  const nodes = graph.nodes;
  const edges = graph.edges;

  const grouped = graph.grouped ?? false;
  const info = useResourceInfo(graph.nodes, invokePromise);
  const kinds = info.kinds;
  // The index knows every box's package, including a package box's own, which its IRI alone does not say.
  const placed = useMemo(
    () => graph.nodes.map((node) => ({ ...node, group: info.groups[node.id] ?? node.group })),
    [graph.nodes, info.groups],
  );
  const semantic = useSemanticLayout(placed, edges, {
    enabled: layout === 'illustrator' || layout === 'diagram',
    grouped,
    labels: info.packages,
  });
  // Only the illustrator places boxes by package, so only its canvas can frame them.
  const frames = layout === 'illustrator' ? semantic.layout.frames : NO_FRAMES;

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
  const computed = useMemo(
    () => (layout === 'illustrator' ? { ...semantic.layout.positions, ...framePositions(frames) } : {}),
    [layout, semantic.layout, frames],
  );
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

  const handleGroupedChange = useCallback(
    () =>
      Obj.update(subject, (subject) => {
        subject.grouped = !grouped;
      }),
    [subject, grouped],
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

  const command = useCommand(subject, invokePromise);
  const speech = useSpeechCommand(command.run);

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
    grouped,
    onLayoutChange: handleLayoutChange,
    onGroupedChange: handleGroupedChange,
    onResetPositions: handleResetPositions,
  });

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...actions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        {/* Positioned rather than a layout box: the details panel floats over the canvas, anchored to this frame. */}
        <div
          className='relative dx-cover'
          data-testid='code-graph-article'
          onKeyDown={(event) => {
            // `/` opens the command bar from the canvas, as in a terminal or a search page.
            if (event.key === '/' && !command.open && !isEditable(event.target)) {
              event.preventDefault();
              command.setOpen(true);
            }
          }}
        >
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
              frames={frames}
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
          <CommandBar
            open={command.open}
            onOpenChange={(open) => {
              command.setOpen(open);
              // The microphone toggle lives in the bar, so closing the bar must not leave it listening.
              if (!open) {
                speech.stop();
              }
            }}
            pending={command.pending}
            outcome={command.outcome}
            onSubmit={command.run}
            verbose={command.verbose}
            onVerboseChange={command.setVerbose}
            draft={speech.heard}
            speech={
              <Button.Root
                icon={
                  speech.loading
                    ? 'ph--spinner--regular'
                    : speech.listening
                      ? 'ph--microphone-slash--regular'
                      : 'ph--microphone--regular'
                }
                iconOnly
                variant={speech.listening ? 'destructive' : 'ghost'}
                // The tooltip carries a microphone or model failure, the one place the bar has for it.
                label={speech.error ?? t(speech.listening ? 'command-stop-listening.label' : 'command-listen.label')}
                onClick={speech.toggle}
                data-testid='code-graph-command-listen'
              />
            }
          />
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
  grouped,
  onLayoutChange,
  onGroupedChange,
  onResetPositions,
}: {
  layout: CodeGraph.Layout;
  pending: boolean;
  hasDragged: boolean;
  grouped: boolean;
  onLayoutChange: (layout: CodeGraph.Layout) => void;
  onGroupedChange: () => void;
  onResetPositions: () => void;
}) =>
  useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'layout',
          {
            label: ['layout.label', { ns: CodeGraphNamespace.key }],
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: layout,
          },
          (group) => {
            for (const { value, icon } of LAYOUTS) {
              group.action(
                value,
                { label: [`layout-${value}.label`, { ns: CodeGraphNamespace.key }], icon, iconOnly: true },
                () => onLayoutChange(value),
              );
            }
          },
        )
        .switch(
          'group-by-package',
          {
            label: ['group-by-package.label', { ns: CodeGraphNamespace.key }],
            icon: 'ph--package--regular',
            iconOnly: true,
            checked: grouped,
            // The force and rank arrangements place boxes with no regard to their package.
            disabled: layout === 'force' || layout === 'rank',
          },
          onGroupedChange,
        )
        .action(
          'reset-positions',
          {
            label: ['reset-positions.label', { ns: CodeGraphNamespace.key }],
            // Spins while the illustrator lays the graph out, the one wait this view has.
            icon: pending ? 'ph--spinner--regular' : 'ph--arrow-counter-clockwise--regular',
            spin: pending,
            iconOnly: true,
            disabled: !hasDragged,
          },
          onResetPositions,
        )
        .build(),
    [layout, pending, hasDragged, grouped, onLayoutChange, onGroupedChange, onResetPositions],
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
      classNames='dx-card-popover'
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
 * What each box is and which package it sits in, from one index query over the whole graph: re-run only when the set of boxes changes, and
 * empty when the index cannot answer, so boxes fall back to their coarse kind.
 */
const NO_INFO: Kind.Info = { kinds: {}, groups: {}, packages: {} };

const useResourceInfo = (nodes: readonly CodeGraph.Node[], invokePromise: Invoke): Kind.Info => {
  const ids = useMemo(
    () =>
      nodes
        .map(({ id }) => id)
        .sort()
        .join('\n'),
    [nodes],
  );
  const [info, setInfo] = useState<Kind.Info>(NO_INFO);
  useEffect(() => {
    const sparql = Kind.query(nodes.map(({ id }) => id));
    if (!sparql) {
      return;
    }
    let cancelled = false;
    void invokePromise(CodeGraphOperation.Query, { sparql, limit: 2000 }).then(({ data }) => {
      if (!cancelled && data) {
        setInfo(Kind.fromRows(nodes, data.rows));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ids, invokePromise]);
  return info;
};

const isEditable = (target: EventTarget) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** The command bar's state: one command at a time, through the RunCommand operation. */
const useCommand = (subject: CodeGraph.CodeGraph, invokePromise: Invoke) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<CommandOutcome>();
  const spaceId = Obj.getDatabase(subject)?.spaceId;
  // A ref, not the `pending` state, so a spoken command arriving mid-run is refused before the next render.
  const running = useRef(false);
  const run = useCallback(
    (text: string) => {
      if (running.current) {
        return;
      }
      running.current = true;
      setPending(true);
      setOutcome({ command: text });
      const started = performance.now();
      void invokePromise(CodeGraphOperation.RunCommand, { graph: Ref.make(subject), command: text }, { spaceId })
        .then(({ data, error }) =>
          setOutcome({
            command: text,
            elapsedMs: performance.now() - started,
            ...(data
              ? { message: data.message, trailer: data.trailer, trace: data.trace }
              : { error: error?.message ?? 'Failed.' }),
          }),
        )
        .finally(() => {
          running.current = false;
          setPending(false);
        });
    },
    [invokePromise, subject, spaceId],
  );
  const [verbose, setVerboseState] = useState(readVerbose);
  const setVerbose = useCallback((value: boolean) => {
    setVerboseState(value);
    try {
      localStorage.setItem(VERBOSE_KEY, value ? '1' : '0');
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this page.
    }
  }, []);

  // The first command pays for starting the index and loading its package list; do that while the user types.
  useEffect(() => {
    const fiber = Effect.runFork(Grounding.packages.pipe(Effect.ignore));
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, []);

  return { open, setOpen, pending, outcome, run, verbose, setVerbose };
};

const VERBOSE_KEY = 'dxos.org/plugin/code-graph/command-verbose';

const readVerbose = () => {
  try {
    return localStorage.getItem(VERBOSE_KEY) === '1';
  } catch {
    return false;
  }
};
