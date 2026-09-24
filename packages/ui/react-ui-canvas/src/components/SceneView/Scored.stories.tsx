//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { Diagnostics, type Scene as Diagram, Mermaid, MermaidEngine, Objective } from '@dxos/diagram';
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
 * 1. The right panel grades the scene with `@dxos/diagram`'s `Diagnostics` and default `Objective` — the
 *    measurements the layout engines pick their candidates by.
 * 2. Drag a node onto another: `node-overlap` appears, the constraint turns red and the cost jumps.
 * 3. Drag nodes so two links cross: `crossings` rises and its weighted term follows; Δ is against the
 *    scene as first loaded.
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
  report: Diagnostics.Report;
  evaluation: Objective.Evaluation;
};

const grade = (scene: Scene): Graded => {
  const converted = toDiagramObjects(scene, defaultNodeRegistry);
  const report = Diagnostics.analyze(converted.objects);
  const evaluation = Objective.evaluate(Objective.DEFAULT, { objects: converted.objects, report });
  return { converted, report, evaluation };
};

const format = (value: number) =>
  Number.isFinite(value) ? (Number.isInteger(value) ? `${value}` : value.toFixed(2)) : '—';

const Delta = ({ value }: { value: number }) =>
  Math.abs(value) < 0.005 ? (
    <span className='text-subdued'>·</span>
  ) : (
    <span className={value > 0 ? 'text-rose-500' : 'text-emerald-600'}>
      {value > 0 ? '+' : '−'}
      {format(Math.abs(value))}
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
};

/** Live grading of the scene the editor shows: re-derived from the store on every change. */
const Scorecard = ({ store, root, atoms, engine }: ScorecardProps) => {
  const registry = useContext(RegistryContext);
  const scene = useAtomValue(store.scene(root));
  const graded = useMemo(() => (scene ? grade(scene) : undefined), [scene]);
  // Captured once per mount, so Δ reads against the scene as it was first loaded.
  const [baseline] = useState(graded);
  if (!graded) {
    return null;
  }

  const { converted, report, evaluation } = graded;
  const errors = Diagnostics.errors(report);
  const warnings = report.diagnostics.filter(({ severity }) => severity === 'warning');
  const baselineTerm = (id: string) => baseline?.evaluation.terms.find((term) => term.id === id);
  const select = (refs: readonly string[]) =>
    registry.set(atoms.selection, new Set(diagnosticElements(converted, refs)));

  return (
    <div
      className='flex flex-col gap-4 p-3 overflow-y-auto text-sm border-l border-separator'
      data-testid='scene-view.scorecard'
    >
      <Section title='Cost'>
        <div className='flex items-baseline gap-2'>
          <span
            className={mx('text-3xl font-mono', evaluation.violations.length ? 'text-rose-500' : 'text-emerald-600')}
            data-testid='scene-view.scorecard.cost'
          >
            {evaluation.cost.toFixed(2)}
          </span>
          {baseline && <Delta value={evaluation.cost - baseline.evaluation.cost} />}
        </div>
        <div className='text-xs text-description'>
          {evaluation.violations.length
            ? `Constraint violations: ${evaluation.violations.length} — the objective would reject this layout.`
            : 'Every constraint holds; lower cost is better.'}
          {engine && ` Engine layout (its own routes): ${engine.cost.toFixed(2)}.`}
        </div>
      </Section>

      <Section title='Constraints'>
        {Objective.DEFAULT.constraints.map(({ id, description }) => {
          const count = evaluation.violations.filter(({ constraint }) => constraint === id).length;
          return (
            <div key={id} className='flex gap-2' title={description}>
              <span className={count ? 'text-rose-500' : 'text-emerald-600'}>{count ? '✕' : '✓'}</span>
              <span className='font-mono'>{id}</span>
              {count > 0 && <span className='text-rose-500'>{count}</span>}
            </div>
          );
        })}
      </Section>

      <Section title='Cost terms'>
        <table className='font-mono text-xs'>
          <thead className='text-description'>
            <tr>
              <th className='text-start font-normal'>term</th>
              <th className='text-end font-normal'>value</th>
              <th className='text-end font-normal'>×w</th>
              <th className='text-end font-normal'>cost</th>
              <th className='text-end font-normal'>Δ</th>
            </tr>
          </thead>
          <tbody>
            {evaluation.terms.map(({ id, value, weighted }) => {
              const term = Objective.DEFAULT.costs.find((cost) => cost.id === id);
              const previous = baselineTerm(id);
              return (
                <tr key={id} title={term?.description}>
                  <td>{id}</td>
                  <td className='text-end'>{format(value)}</td>
                  <td className='text-end text-description'>{term?.weight}</td>
                  <td className='text-end'>{weighted.toFixed(2)}</td>
                  <td className='text-end'>{previous && <Delta value={weighted - previous.weighted} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
  const [seed, setSeed] = useState<Seed>();
  const [failure, setFailure] = useState<string>();
  useEffect(() => {
    if (fixture === 'classes') {
      setSeed(createClassSceneTree());
      return;
    }
    let cancelled = false;
    fromMermaid(source)
      .then((next) => {
        if (!cancelled) {
          setSeed(next);
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
  // Keyed on the seed so a new one remounts the editor and resets the baseline.
  return <Editor key={`${fixture}:${source}`} store={store} root={seed.root} engine={seed.engine} />;
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
