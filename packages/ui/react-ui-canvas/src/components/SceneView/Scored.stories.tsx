//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { Fragment, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { Diagnostics, type Scene as Diagram, Mermaid, MermaidEngine, Objective, Score } from '@dxos/diagram';
import { BASIC } from '@dxos/diagram/testing';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { type SceneViewAtoms, createSceneViewAtoms } from '../../model/atoms.ts';
import { defaultNodeRegistry } from '../../model/registry.ts';
import { type SceneStore, createMemoryStore } from '../../model/store.ts';
import { type Scene, type SceneId } from '../../model/types.ts';
import { SceneBuilder } from '../../utils/builder.ts';
import { diagnosticElements, toDiagramObjects } from '../../utils/diagram.ts';
import { createClassSceneTree } from '../../utils/testing.ts';
import { SceneView } from './SceneView.tsx';

/**
 * Test:
 * 1. The right panel lists one 0–1 score per scorer (1 is good), tagged by kind: the default `Objective`'s
 *    constraints (pass 1, fail 0) and cost terms (weighted cost through `Score.fromCost`).
 * 2. Drag a node onto another: `no-hard-defects` drops to 0, and so does the overall score.
 * 3. Drag nodes so two links cross: the `crossings` score falls; Δ is against the scene as first loaded.
 * 4. Click a diagnostic to select the elements it names on the canvas.
 */

const ROOT = 'scene:scored';

/** A flowchart with subgraphs and cross-links, dense enough that dragging changes the score quickly. */
const PLATFORM = `
  flowchart TB
    subgraph client [Client]
      App[Composer]
      Framework[App Framework]
    end
    subgraph core [Core]
      Echo[ECHO]
      Halo[HALO]
      Mesh[MESH]
    end
    Edge[EDGE]
    App --> Framework
    Framework --> Echo
    Framework --> Halo
    Echo --> Mesh
    Halo --> Mesh
    Mesh --> Edge
    Edge --> Echo
`;

type Seed = { scenes: Scene[]; root: SceneId; engine?: Objective.Evaluation };

/**
 * Places the diagram with the mermaid engine, then rebuilds it as editable nodes: groups become guide
 * frames behind their members and edges become smart links, so the routes follow the nodes as they
 * move rather than keeping the engine's.
 */
const fromMermaid = async (source: string): Promise<Seed> => {
  const graph = Mermaid.parse(source);
  const result = await MermaidEngine.layout(source);
  const boxes = new Map(
    result.commands.flatMap((command) => {
      if (command.op !== 'upsert-object') {
        return [];
      }
      const { id, origin = { x: 0, y: 0 }, elements } = command.object;
      const box = elements.find((element): element is Diagram.Box => element.kind === 'rect');
      return box ? [[id, { x: origin.x + box.x, y: origin.y + box.y, width: box.w, height: box.h }] as const] : [];
    }),
  );
  const nodeId = (id: string) => `${ROOT}/${id}`;
  const builder = SceneBuilder.create(ROOT);
  // Frames first, so their lower z keeps members clickable on top of them. Unlabelled: a rect centres
  // its label, where the members would cover it.
  for (const group of graph.groups) {
    const box = boxes.get(group.id);
    if (box) {
      builder.rect(nodeId(group.id), box);
    }
  }
  for (const node of graph.nodes) {
    const box = boxes.get(node.id);
    if (box) {
      builder.rect(nodeId(node.id), box, node.label);
    }
  }
  graph.edges.forEach(({ from, to }, index) => {
    builder.smart(nodeId(`${from}-${to}-${index}`), nodeId(from), nodeId(to), { directed: true });
  });
  const built = builder.build();
  const frames = new Set(graph.groups.map(({ id }) => nodeId(id)));
  const nodes = Object.fromEntries(
    Object.entries(built.nodes).map(([id, node]) => [
      id,
      frames.has(id) ? { ...node, style: { ...node.style, guide: true } } : node,
    ]),
  );
  return { scenes: [{ ...built, nodes }], root: ROOT, engine: result.chosen.evaluation };
};

type Graded = {
  converted: ReturnType<typeof toDiagramObjects>;
  layout: Objective.Layout;
};

const grade = (scene: Scene): Graded => {
  const converted = toDiagramObjects(scene, defaultNodeRegistry);
  return { converted, layout: { objects: converted.objects, report: Diagnostics.analyze(converted.objects) } };
};

/** The engine's own evaluation on the same 0–1 scale, for reference. */
const engineScore = ({ violations, terms }: Objective.Evaluation): number =>
  Score.overall([
    { kind: 'constraint', score: violations.length ? 0 : 1 },
    ...terms.map(({ weighted }) => ({ kind: 'cost', score: Score.fromCost(weighted) })),
  ]);

const DEFAULT_SCORERS = Score.fromObjective(Objective.DEFAULT);

const format = (value: number) =>
  Number.isFinite(value) ? (Number.isInteger(value) ? `${value}` : value.toFixed(2)) : '—';

const scoreColor = (score: number) =>
  score >= 0.75 ? 'text-emerald-600' : score >= 0.4 ? 'text-amber-600' : 'text-rose-500';

const barColor = (score: number) => (score >= 0.75 ? 'bg-emerald-600' : score >= 0.4 ? 'bg-amber-600' : 'bg-rose-500');

const KIND_STYLE: Record<string, string> = {
  constraint: 'border-violet-500/50 text-violet-500',
  cost: 'border-sky-500/50 text-sky-500',
};

const KindPill = ({ kind }: { kind: string }) => (
  <span
    className={mx(
      'px-1.5 rounded-full border text-[10px] leading-4 uppercase tracking-wide',
      KIND_STYLE[kind] ?? 'border-separator text-description',
    )}
  >
    {kind}
  </span>
);

/** Change in a 0–1 score; higher is better. */
const Delta = ({ value }: { value: number }) =>
  Math.abs(value) < 0.005 ? (
    <span className='text-subdued'>·</span>
  ) : (
    <span className={value > 0 ? 'text-emerald-600' : 'text-rose-500'}>
      {value > 0 ? '+' : '−'}
      {Math.abs(value).toFixed(2)}
    </span>
  );

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className='flex flex-col gap-1'>
    <h2 className='text-xs uppercase tracking-wide text-description'>{title}</h2>
    {children}
  </section>
);

type ScorecardProps = {
  store: SceneStore;
  root: SceneId;
  atoms: SceneViewAtoms;
  engine?: Objective.Evaluation;
  /** Every judge of the layout, of any kind; defaults to the objective's constraints and cost terms. */
  scorers?: readonly Score.Scorer[];
};

/** Live grading of the scene the editor shows: re-derived from the store on every change. */
const Scorecard = ({ store, root, atoms, engine, scorers = DEFAULT_SCORERS }: ScorecardProps) => {
  const registry = useContext(RegistryContext);
  const scene = useAtomValue(store.scene(root));
  const graded = useMemo(() => (scene ? grade(scene) : undefined), [scene]);
  const [scores, setScores] = useState<readonly Score.Scored[]>();
  // The first scores, so Δ reads against the scene as it was first loaded.
  const [baseline, setBaseline] = useState<readonly Score.Scored[]>();
  useEffect(() => {
    if (!graded) {
      return;
    }
    // A scorer may resolve late; a newer scene interrupts the run for the one it replaces.
    const fiber = Effect.runFork(
      Score.evaluate(scorers, graded.layout).pipe(
        Effect.tap((next) =>
          Effect.sync(() => {
            setScores(next);
            setBaseline((previous) => previous ?? next);
          }),
        ),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [graded, scorers]);
  if (!graded || !scores) {
    return null;
  }

  const { converted, layout } = graded;
  const { report } = layout;
  const total = Score.overall(scores);
  const baselineTotal = baseline && Score.overall(baseline);
  const errors = Diagnostics.errors(report);
  const warnings = report.diagnostics.filter(({ severity }) => severity === 'warning');
  const select = (refs: readonly string[]) =>
    registry.set(atoms.selection, new Set(diagnosticElements(converted, refs)));

  return (
    <div
      className='flex flex-col gap-4 p-3 overflow-y-auto text-sm border-l border-separator'
      data-testid='scene-view.scorecard'
    >
      <Section title='Score'>
        <div className='flex items-baseline gap-2'>
          <span className={mx('text-3xl font-mono', scoreColor(total))} data-testid='scene-view.scorecard.score'>
            {total.toFixed(2)}
          </span>
          {baselineTotal !== undefined && <Delta value={total - baselineTotal} />}
        </div>
        <div className='text-xs text-description'>
          0 is bad, 1 is good. A broken constraint scores 0 overall; otherwise the mean of the other scores.
          {engine && ` Engine layout (its own routes): ${engineScore(engine).toFixed(2)}.`}
        </div>
      </Section>

      <Section title='Scores'>
        {scores.map(({ id, kind, description, score, detail }) => {
          const previous = baseline?.find((entry) => entry.id === id);
          return (
            <div
              key={id}
              className='grid grid-cols-[5.5rem_1fr_3rem_2.5rem] items-center gap-2 text-xs'
              title={[description, detail].filter(Boolean).join('\n')}
              data-testid={`scene-view.scorecard.${id}`}
            >
              <span>
                <KindPill kind={kind} />
              </span>
              <span className='flex flex-col gap-0.5 min-w-0'>
                <span className='font-mono truncate'>{id}</span>
                <span className='h-1 rounded-full bg-separator overflow-hidden'>
                  <span className={mx('block h-full', barColor(score))} style={{ width: `${score * 100}%` }} />
                </span>
              </span>
              <span className={mx('font-mono text-end', scoreColor(score))}>{score.toFixed(2)}</span>
              <span className='font-mono text-end'>{previous && <Delta value={score - previous.score} />}</span>
            </div>
          );
        })}
      </Section>

      <Section title='Metrics'>
        <div className='grid grid-cols-[1fr_auto] gap-x-4 font-mono text-xs'>
          {Object.entries(report.metrics).map(([key, value]) => (
            <Fragment key={key}>
              <span className='text-description'>{key}</span>
              <span className='text-end'>{format(value)}</span>
            </Fragment>
          ))}
        </div>
      </Section>

      <Section title={`Diagnostics · ${errors.length} errors · ${warnings.length} warnings`}>
        {report.diagnostics.length === 0 && <span className='text-description'>None.</span>}
        {report.diagnostics.map((diagnostic, index) => (
          <button
            key={index}
            className={mx(
              'text-start text-xs hover:underline',
              diagnostic.severity === 'error' ? 'text-rose-500' : 'text-amber-600',
            )}
            onClick={() => select(diagnostic.refs)}
          >
            <span className='font-mono'>{diagnostic.code}</span> {diagnostic.message}
          </button>
        ))}
      </Section>
    </div>
  );
};

type EditorProps = { store: SceneStore; root: SceneId; engine?: Objective.Evaluation };

const Editor = ({ store, root, engine }: EditorProps) => {
  const atoms = useMemo(() => createSceneViewAtoms(root), [root]);
  return (
    <div className='dx-fill grid grid-cols-[1fr_24rem]'>
      <SceneView.Root store={store} root={root} atoms={atoms}>
        <SceneView.Canvas liveDepth={0} />
        <SceneView.Actions />
        <SceneView.Palette />
      </SceneView.Root>
      <Scorecard store={store} root={root} atoms={atoms} engine={engine} />
    </div>
  );
};

type StoryArgs = {
  /** Mermaid flowchart laid out by the engine; ignored when `fixture` is `classes`. */
  source?: string;
  fixture?: 'mermaid' | 'classes';
};

const DefaultStory = ({ source = BASIC, fixture = 'mermaid' }: StoryArgs) => {
  // The key travels with the seed so the editor remounts when the new scene arrives, not before it.
  const [seed, setSeed] = useState<Seed & { key: string }>();
  const [failure, setFailure] = useState<string>();
  useEffect(() => {
    const key = `${fixture}:${source}`;
    if (fixture === 'classes') {
      setSeed({ ...createClassSceneTree(), key });
      setFailure(undefined);
      return;
    }
    let cancelled = false;
    fromMermaid(source)
      .then((next) => {
        if (!cancelled) {
          setSeed({ ...next, key });
          setFailure(undefined);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFailure(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, fixture]);
  const store = useMemo(() => seed && createMemoryStore(seed.scenes), [seed]);

  if (failure) {
    return <pre className='p-2 text-xs text-rose-500 whitespace-pre-wrap'>{failure}</pre>;
  }
  if (!seed || !store) {
    return <div className='dx-fill' />;
  }
  return <Editor key={seed.key} store={store} root={seed.root} engine={seed.engine} />;
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/scene/Scored',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  argTypes: {
    source: { control: 'text', description: 'Mermaid flowchart laid out by the engine' },
    fixture: { control: 'radio', options: ['mermaid', 'classes'] },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Three packages × three types, placed by the mermaid engine: drag to see every score move. */
export const Default: Story = {
  args: { source: BASIC.trim(), fixture: 'mermaid' },
};

/** The platform block diagram: subgraph frames and a back edge. */
export const Platform: Story = {
  args: { source: PLATFORM.trim(), fixture: 'mermaid' },
};

/** The scene engine's own class fixture, graded as drawn. */
export const Classes: Story = {
  args: { fixture: 'classes' },
};
