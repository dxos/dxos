//
// Copyright 2026 DXOS.org
//

import { syntaxHighlighting } from '@codemirror/language';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { mermaid as mermaidLanguage } from 'codemirror-lang-mermaid';
import Mermaid from 'mermaid';
import React, { useEffect, useId, useMemo, useState } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createThemeExtensions, listener, mermaidHighlightStyle } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { Diagnostics, MermaidEngine, type Scene, UmlGrid } from '#model';

import appFramework from '../../docs/diagrams/app-framework.mmd?raw';
import assistant from '../../docs/diagrams/assistant.mmd?raw';
import compute from '../../docs/diagrams/compute.mmd?raw';
import echo from '../../docs/diagrams/echo.mmd?raw';
import edge from '../../docs/diagrams/edge.mmd?raw';
import pipeline from '../../docs/diagrams/pipeline.mmd?raw';
import { BASIC } from '../model/testing';
import { SceneSvg } from './SceneSvg';

//
// Layout bench: the mermaid source (left, editable) with mermaid's own rendering beneath it as the
// reference the DSL author sees elsewhere, and our engine's layout on the right with the Tier-1
// report. Edit the source live; both renders follow.
//

const objectsOf = (commands: readonly Scene.Command[]): Scene.WorldObject[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Theme-aware CodeMirror editor in the mermaid language mode. */
const SourceEditor = ({ initialValue, onChange }: { initialValue: string; onChange: (text: string) => void }) => {
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue,
      extensions: [
        createBasicExtensions({ lineNumbers: true }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        mermaidLanguage(),
        // The language emits its own lezer tags, so the standard highlight style would not color it.
        syntaxHighlighting(mermaidHighlightStyle()),
        listener({ onChange: ({ text }) => onChange(text) }),
      ],
    }),
    [themeMode],
  );

  return (
    <div {...focusAttributes} ref={parentRef} className='dx-fill overflow-auto' data-testid='layout-bench.source' />
  );
};

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
  // Mermaid returns a sanitized SVG string; there is no element form to render. The SVG carries its
  // own size, so it is scaled to the panel rather than clipped.
  return (
    <div
      className='dx-fill overflow-hidden p-2 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-none'
      dangerouslySetInnerHTML={{ __html: svg ?? '' }}
    />
  );
};

const Header = ({ children }: { children: string }) => (
  <div className='px-3 py-1.5 text-xs uppercase tracking-wide text-description dx-base-surface'>{children}</div>
);

type StoryArgs = {
  source: string;
  /** Lattice pitch as a multiple of the cell size. */
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
    <div className='dx-fill grid grid-cols-[minmax(24rem,2fr)_3fr] gap-px bg-separator'>
      {/* Left: editor above the mermaid reference. */}
      <div className='grid grid-rows-[auto_1fr_auto_1fr] min-h-0 gap-px bg-separator'>
        <Header>Source</Header>
        {/* Keyed on the fixture so switching stories replaces the buffer; edits otherwise persist. */}
        <div className='dx-base-surface min-h-0'>
          <SourceEditor key={initial} initialValue={initial} onChange={setSource} />
        </div>
        <Header>Mermaid</Header>
        <div className='dx-base-surface min-h-0'>
          <MermaidDiagram source={source} />
        </div>
      </div>
      {/* Right: the engine's layout, scaled to fit, with the report. */}
      <div className='grid grid-rows-[auto_1fr_auto] min-h-0 gap-px bg-separator'>
        <Header>Layout</Header>
        {/* The SVG is the grid item itself: a percentage height inside a wrapper resolves to the
            viewBox's intrinsic size and the row grows to it instead of the SVG scaling to fit. */}
        <SceneSvg
          classNames='dx-attention-surface dx-base-surface min-h-0 min-w-0'
          objects={objects}
          grid={UmlGrid.GRID}
        />
        <div className='p-2 font-mono text-xs dx-base-surface' data-testid='layout-bench.report'>
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

/** Basic: three packages × three types — inheritance fan-in, has-many chain, fan-in — small enough to argue over. */
export const Basic: Story = { args: { source: BASIC.trim() } };
export const Echo: Story = { args: { source: echo } };
export const Assistant: Story = { args: { source: assistant } };
export const Compute: Story = { args: { source: compute } };
export const Pipeline: Story = { args: { source: pipeline } };
export const AppFramework: Story = { args: { source: appFramework } };
export const Edge: Story = { args: { source: edge } };
