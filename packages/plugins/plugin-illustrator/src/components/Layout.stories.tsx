//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import Mermaid from 'mermaid';
import React, { useEffect, useId, useMemo, useState } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Diagnostics, MermaidEngine, type Scene, UmlGrid } from '#model';

import appFramework from '../../docs/diagrams/app-framework.mmd?raw';
import assistant from '../../docs/diagrams/assistant.mmd?raw';
import compute from '../../docs/diagrams/compute.mmd?raw';
import echo from '../../docs/diagrams/echo.mmd?raw';
import edge from '../../docs/diagrams/edge.mmd?raw';
import pipeline from '../../docs/diagrams/pipeline.mmd?raw';
import { SceneSvg } from './SceneSvg';

//
// Layout bench: the same mermaid source rendered by mermaid itself (the reference the DSL author
// sees elsewhere) beside our engine's layout, with the Tier-1 report underneath. Edit the source
// live; both columns follow.
//

const objectsOf = (commands: readonly Scene.Command[]): Scene.WorldObject[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Reference rendering through mermaid.js; `%% ref` lines are comments to it and are ignored. */
const MermaidDiagram = ({ source }: { source: string }) => {
  const { themeMode } = useThemeContext();
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    Mermaid.initialize({
      startOnLoad: false,
      theme: themeMode === 'dark' ? 'dark' : 'neutral',
      securityLevel: 'loose',
    });
    Mermaid.render(`mermaid-${id}`, source)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg);
          setError(undefined);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, themeMode, id]);

  if (error) {
    return <pre className='p-2 text-xs text-rose-500 whitespace-pre-wrap'>{error}</pre>;
  }
  // Mermaid returns a sanitized SVG string; there is no element form to render.
  return (
    <div className='dx-fill overflow-auto p-2 [&>svg]:max-w-full' dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
  );
};

type StoryArgs = {
  source: string;
  /** Lattice pitch as a multiple of the cell size; 0 disables quantization. */
  lattice: number;
};

const Bench = ({ source: initial, lattice }: StoryArgs) => {
  const [source, setSource] = useState(initial);
  useEffect(() => setSource(initial), [initial]);
  const [objects, setObjects] = useState<Scene.WorldObject[]>([]);
  const [failure, setFailure] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    MermaidEngine.compile(source, { lattice })
      .then((commands) => {
        if (!cancelled) {
          setObjects(objectsOf(commands));
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
  }, [source, lattice]);
  const report = useMemo(() => Diagnostics.analyze(objects), [objects]);
  const errors = Diagnostics.errors(report);

  return (
    <div className='dx-fill grid grid-cols-[minmax(20rem,1fr)_2fr_3fr] grid-rows-[auto_1fr] gap-px bg-separator'>
      {['Source', 'Mermaid', 'Layout'].map((title) => (
        <div key={title} className='px-3 py-1.5 text-xs uppercase tracking-wide text-description bg-baseSurface'>
          {title}
        </div>
      ))}
      <textarea
        className='dx-fill resize-none p-3 font-mono text-xs bg-baseSurface text-baseText outline-none'
        spellCheck={false}
        value={source}
        onChange={(event) => setSource(event.target.value)}
        data-testid='layout-bench.source'
      />
      <div className='bg-baseSurface min-w-0'>
        <MermaidDiagram source={source} />
      </div>
      <div className='bg-baseSurface min-w-0 grid grid-rows-[1fr_auto]'>
        <SceneSvg classNames='dx-attention-surface' objects={objects} grid={UmlGrid.GRID} />
        <div className='p-2 font-mono text-xs border-bs border-separator' data-testid='layout-bench.report'>
          {failure ? (
            <span className='text-rose-500'>{failure}</span>
          ) : (
            <>
              <span className={mx(errors.length ? 'text-rose-500' : 'text-emerald-600')}>{errors.length} errors</span>
              {` · ${report.metrics.nodes} nodes · ${report.metrics.connectors} connectors · ${report.metrics.crossings} crossings · ${report.metrics.bends} bends`}
              {errors.map((diagnostic) => (
                <div key={diagnostic.message} className='text-rose-500'>
                  {diagnostic.message}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-illustrator/components/Layout',
  render: Bench,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  args: { lattice: 1.5 },
  argTypes: {
    lattice: { control: { type: 'range', min: 1, max: 3, step: 0.25 } },
  },
} satisfies Meta<typeof Bench>;

export default meta;

type Story = StoryObj<typeof meta>;

const corpus: Record<string, string> = {
  echo,
  assistant,
  compute,
  pipeline,
  'app-framework': appFramework,
  edge,
};

export const Echo: Story = { args: { source: corpus.echo } };
export const Assistant: Story = { args: { source: corpus.assistant } };
export const Compute: Story = { args: { source: corpus.compute } };
export const Pipeline: Story = { args: { source: corpus.pipeline } };
export const AppFramework: Story = { args: { source: corpus['app-framework'] } };
export const Edge: Story = { args: { source: corpus.edge } };
