//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useState } from 'react';

import { Appeal, Diagnostics, Dsl, type Scene, type Semantic, SemanticEngine, UmlGrid } from '@dxos/diagram';
import { diagram as diagramLanguage } from '@dxos/diagram/extension';
import * as EffectEx from '@dxos/effect/EffectEx';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { SceneSvg } from './SceneSvg.tsx';
import appFramework from './testing/app-framework.dx?raw';
import compute from './testing/compute.dx?raw';
import processSource from './testing/process.dx?raw';
import relations from './testing/relations.dx?raw';
import stacked from './testing/stacked.dx?raw';

//
// Constraints bench: the semantic DSL (left, editable) states intent — nodes, edges, groups and
// whatever placement or routing hints matter — and the engine fills the rest. The centre shows the
// compiled diagram with its problems, recompiling as you type; the right scores it. With `compare`
// on, the same graph with every hint stripped is compiled beneath it, so each hint's worth shows.
//

const objectsOf = (commands: readonly Scene.Command[]): Scene.WorldObject[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** The diagram with nothing but its nodes, edges and groups: what the engine does unaided. */
const withoutHints = (diagram: Semantic.Diagram): Semantic.Diagram => ({
  ...diagram,
  hinted: false,
  grid: undefined,
  box: undefined,
  nodes: diagram.nodes.map(({ pin: _pin, ...node }) => ({ ...node, relations: [] })),
  groups: diagram.groups.map(({ gap: _gap, ...group }) => ({ ...group, relations: [] })),
  edges: diagram.edges.map(({ bus: _bus, ...edge }) => ({
    ...edge,
    via: [],
    from: { node: edge.from.node, range: edge.from.range },
    to: { node: edge.to.node, range: edge.to.range },
  })),
  busLabels: new Map(),
});

type Compiled = { objects: Scene.WorldObject[]; problems: readonly Dsl.Problem[]; ms: number };

/** Compiles a source a moment after typing stops; the last good result stays up while it runs. */
const useCompiled = (source: string, strip: boolean): Compiled | undefined => {
  const [compiled, setCompiled] = useState<Compiled>();
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const started = performance.now();
      const run = strip
        ? Effect.promise(async () => {
            const reading = Dsl.read(source);
            return reading.diagram
              ? Dsl.withLayout(reading, await SemanticEngine.compile(withoutHints(reading.diagram)))
              : Dsl.withLayout(reading);
          })
        : Dsl.compile(source);
      void EffectEx.runPromise(run).then(
        ({ commands, problems }) => {
          if (!cancelled) {
            setCompiled({ objects: objectsOf(commands), problems, ms: Math.round(performance.now() - started) });
          }
        },
        (error: unknown) => {
          // A failed compile replaces the last result, so the bench never shows stale output as current.
          if (!cancelled) {
            const message = error instanceof Error ? error.message : String(error);
            setCompiled({
              objects: [],
              problems: [{ severity: 'error', message, from: 0, to: source.length }],
              ms: Math.round(performance.now() - started),
            });
          }
        },
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source, strip]);
  return compiled;
};

/** The semantic DSL in the diagram language mode; parse problems lint inline, layout ones show beside the drawing. */
const SourceEditor = ({ initialValue, onChange }: { initialValue: string; onChange: (text: string) => void }) => {
  const themeMode = Hooks.useThemeMode();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue,
      extensions: [
        createBasicExtensions({ lineNumbers: true }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        diagramLanguage({ layout: false }),
        listener({ onChange: ({ text }) => onChange(text) }),
      ],
    }),
    [themeMode],
  );
  return (
    <div {...focusAttributes} ref={parentRef} className='dx-fill overflow-auto' data-testid='constraints.source' />
  );
};

const Header = ({ children }: { children: string }) => (
  <div className='px-3 py-1.5 text-xs uppercase tracking-wide text-fg-muted dx-base-surface'>{children}</div>
);

/** One rendering with its problems listed beneath it. */
const Drawing = ({ title, compiled, testId }: { title: string; compiled?: Compiled; testId: string }) => (
  <Layout.Grid rows={['min', 'fill', 'min']} classNames='min-h-0 gap-px bg-separator'>
    <Header>{compiled ? `${title} · ${compiled.ms} ms` : `${title} · compiling…`}</Header>
    <SceneSvg
      classNames='dx-attention-surface dx-base-surface min-h-0 min-w-0'
      objects={compiled?.objects ?? []}
      grid={UmlGrid.GRID}
    />
    <div className='p-2 font-mono text-xs dx-base-surface' data-testid={testId}>
      {compiled && compiled.problems.length === 0 && <span className='text-success-text'>no problems</span>}
      {compiled?.problems.map((problem, index) => (
        <div key={index} className={problem.severity === 'error' ? 'text-error-text' : 'text-warning-text'}>
          {`${problem.severity}: ${problem.message}`}
        </div>
      ))}
    </div>
  </Layout.Grid>
);

/** Metrics, overall appeal and every appeal rule, worst first. */
const Scores = ({ title, compiled }: { title: string; compiled?: Compiled }) => {
  const scored = useMemo(() => {
    if (!compiled) {
      return undefined;
    }
    const report = Diagnostics.analyze(compiled.objects);
    const rules = Appeal.measure(compiled.objects).sort((left, right) => left.score - right.score);
    return { report, rules, overall: Appeal.overall(rules), errors: Diagnostics.errors(report) };
  }, [compiled]);
  if (!scored) {
    return null;
  }
  const { metrics } = scored.report;
  const rows: [string, string][] = [
    ['appeal', scored.overall.toFixed(3)],
    ['errors', String(scored.errors.length)],
    ['crossings', String(metrics.crossings)],
    ['bends', String(metrics.bends)],
    ['edge overlaps', String(metrics.edgeOverlaps)],
    ['text overlaps', String(metrics.textOverlaps)],
    ['area', `${metrics.width} × ${metrics.height}`],
  ];
  return (
    <div className='p-3 space-y-3 text-xs' data-testid='constraints.scores'>
      <div className='text-sm font-medium'>{title}</div>
      <Layout.Grid cols={['fill', 'min']} gap='xs' classNames='font-mono'>
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <span className='text-fg-muted'>{label}</span>
            <span
              className={mx(
                'text-end',
                label === 'errors' && (scored.errors.length ? 'text-error-text' : 'text-success-text'),
              )}
            >
              {value}
            </span>
          </React.Fragment>
        ))}
      </Layout.Grid>
      <Layout.Grid cols={['fill', 'min', 'min']} gap='xs'>
        <span className='text-fg-subtle'>rule</span>
        <span className='text-fg-subtle text-end'>weight</span>
        <span className='text-fg-subtle text-end'>score</span>
        {scored.rules.map((rule) => (
          <React.Fragment key={rule.id}>
            <span title={rule.detail}>
              {rule.id}
              <span className='block text-fg-subtle'>{rule.detail}</span>
            </span>
            <span className='font-mono text-end text-fg-muted'>{rule.weight}</span>
            <span
              className={mx(
                'font-mono text-end',
                rule.score < 0.5 ? 'text-error-text' : rule.score < 0.8 ? 'text-warning-text' : 'text-success-text',
              )}
            >
              {rule.score.toFixed(2)}
            </span>
          </React.Fragment>
        ))}
      </Layout.Grid>
    </div>
  );
};

type StoryArgs = {
  source: string;
  /** Also compile the graph with every hint stripped, beneath the hinted one. */
  compare: boolean;
};

const Bench = ({ source: initial, compare }: StoryArgs) => {
  const [source, setSource] = useState(initial);
  useEffect(() => setSource(initial), [initial]);
  const hinted = useCompiled(source, false);
  const bare = useCompiled(compare ? source : '', true);

  return (
    <Layout.Grid grow cols={['28rem', 'fill', '22rem']} classNames='gap-px bg-separator'>
      <Layout.Grid rows={['min', 'fill']} classNames='min-h-0 gap-px bg-separator'>
        <Header>Semantic DSL</Header>
        {/* Keyed on the fixture so switching stories replaces the buffer; edits otherwise persist. */}
        <div className='dx-base-surface min-h-0'>
          <SourceEditor key={initial} initialValue={initial} onChange={setSource} />
        </div>
      </Layout.Grid>
      <Layout.Grid rows={compare ? 2 : 1} classNames='min-h-0 gap-px bg-separator'>
        <Drawing title='With hints' compiled={hinted} testId='constraints.problems' />
        {compare && <Drawing title='No hints' compiled={bare} testId='constraints.bare-problems' />}
      </Layout.Grid>
      <ScrollArea.Root orientation='vertical' classNames='dx-base-surface min-h-0'>
        <ScrollArea.Viewport>
          <Scores title='With hints' compiled={hinted} />
          {compare && <Scores title='No hints' compiled={bare} />}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Layout.Grid>
  );
};

const meta = {
  title: 'plugins/plugin-illustrator/components/Constraints',
  render: Bench,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  args: { compare: false },
  argTypes: {
    compare: { description: 'Also lay out the same graph with every hint stripped.', control: 'boolean' },
  },
} satisfies Meta<typeof Bench>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Requesters over the local runtime, the EDGE runtime beside it; relations only, no coordinates. */
export const Process: Story = { args: { source: processSource, compare: true } };

/** Authoring, runtime and React layer, with a labelled bus from CapabilityManager and ownership diamonds. */
export const AppFramework: Story = { args: { source: appFramework } };

/** Three tiers of packages, a gathering bus into compute-runtime and an implementation edge. */
export const Compute: Story = { args: { source: compute } };

/** The textbook case: A to B past a box in between goes side to side down the gutter. */
export const StackedBoxes: Story = { args: { source: stacked } };

/** Every relationship word: extends, composes, owns, one-to-many, many-to-many, depends-on. */
export const Relations: Story = { args: { source: relations } };
