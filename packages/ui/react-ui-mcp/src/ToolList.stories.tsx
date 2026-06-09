//
// Copyright 2026 DXOS.org
//

// ToolList + ToolForm + result panel laid out using CSS Grid
// `grid-template-areas`, so each region is positioned by name (`tools`,
// `form`, `results`) instead of fragile column/row math:
//
//   ┌──────────┬──────────┐
//   │ tools    │          │
//   ├──────────┤  results │
//   │ form     │          │
//   └──────────┴──────────┘
//
// The left column stacks the tool list (top) and the form for the selected
// tool (bottom). The right column spans both rows for the run output.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useMemo, useState } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Tool, ToolList } from './ToolList';

// Fixture: representative subset of the @dxos/introspect-mcp tools so the
// story has realistic content without depending on the actual schemas at
// story time. In production the consumer derives this list from
// `createToolDefinitions(introspector, log)`.
const SAMPLE_TOOLS: Tool[] = [
  {
    id: 'list_packages',
    title: 'List monorepo packages',
    description: 'List packages in the DXOS monorepo. Filter by name, path prefix, or workspace-private only.',
  },
  {
    id: 'find_symbol',
    title: 'Find an exported symbol by name',
    description:
      'Locate an exported symbol (function, class, type) by name across all packages. Ranks exact > prefix > substring.',
  },
  {
    id: 'list_plugins',
    title: 'List Composer plugins',
    description:
      'List plugins detected in the monorepo (Plugin.define + meta.ts). Returns lightweight rows; call get_plugin for full detail.',
  },
  {
    id: 'list_schemas',
    title: 'List schemas',
    description: 'List ECHO-registered types — anything passing through Type.makeObject({ typename, version }).',
  },
];

// Three named grid areas. Tailwind's arbitrary-value syntax lets us inline
// the template directly without a separate CSS file.
const GRID_LAYOUT = mx(
  'grid h-[480px] gap-3',
  '[grid-template-columns:minmax(240px,1fr)_2fr]',
  '[grid-template-rows:1fr_1fr]',
  // Each value is one row; tokens within a row are columns. `tools` sits
  // top-left, `form` bottom-left, and `results` spans both rows on the right.
  "[grid-template-areas:'tools_results''form_results']",
);

const PaneTools = ({ children }: { children: ReactNode }) => (
  <section
    aria-label='Tools'
    className='[grid-area:tools] overflow-auto rounded border border-separator bg-baseSurface p-2'
  >
    {children}
  </section>
);

const PaneForm = ({ children }: { children: ReactNode }) => (
  <section
    aria-label='Form'
    className='[grid-area:form] overflow-auto rounded border border-separator bg-baseSurface p-3'
  >
    {children}
  </section>
);

const PaneResults = ({ children }: { children: ReactNode }) => (
  <section
    aria-label='Results'
    className='[grid-area:results] overflow-auto rounded border border-separator bg-baseSurface p-3'
  >
    {children}
  </section>
);

type Result = { tool: string; args: Record<string, unknown> } | null;

const Playground = () => {
  const [selectedId, setSelectedId] = useState<string | null>(SAMPLE_TOOLS[0].id);
  const [result, setResult] = useState<Result>(null);

  const selected = useMemo(() => SAMPLE_TOOLS.find((t) => t.id === selectedId) ?? null, [selectedId]);

  return (
    <div className={GRID_LAYOUT}>
      <PaneTools>
        <ToolList.Root selectedId={selectedId} onSelect={setSelectedId}>
          <ToolList.Content tools={SAMPLE_TOOLS} />
        </ToolList.Root>
      </PaneTools>

      <PaneForm>
        {selected ? (
          <div className='flex flex-col gap-3'>
            <header>
              <h2 className='text-sm font-semibold'>{selected.title}</h2>
              {selected.description ? <p className='text-xs text-subdued'>{selected.description}</p> : null}
            </header>
            {/*
              In production: pass the tool's Effect Schema input here. The
              story mocks the form with a simple JSON-args submitter so the
              storybook doesn't need a runtime Effect Schema instance.
            */}
            <MockToolForm toolId={selected.id} onRun={(args) => setResult({ tool: selected.id, args })} />
          </div>
        ) : (
          <p className='text-sm text-subdued'>Pick a tool from the list.</p>
        )}
      </PaneForm>

      <PaneResults>
        {result ? (
          <pre className='whitespace-pre-wrap break-all text-xs'>{JSON.stringify(result, null, 2)}</pre>
        ) : (
          <p className='text-sm text-subdued'>Run a tool to see results here.</p>
        )}
      </PaneResults>
    </div>
  );
};

/**
 * Story-only stand-in for the real `<ToolForm>`. Keeps the storybook
 * standalone — the production component will accept an Effect Schema and
 * render via `react-ui-form`.
 */
const MockToolForm = ({ toolId, onRun }: { toolId: string; onRun: (args: Record<string, unknown>) => void }) => {
  const [json, setJson] = useState('{}');
  return (
    <div className='flex flex-col gap-2'>
      <label className='flex flex-col gap-1 text-xs'>
        <span className='font-medium'>args (JSON)</span>
        <textarea
          className='min-h-24 rounded border border-separator bg-input p-2 font-mono text-xs'
          value={json}
          onChange={(event) => setJson(event.target.value)}
          spellCheck={false}
        />
      </label>
      <button
        type='button'
        className='self-end rounded bg-accentSurface px-3 py-1 text-xs font-medium text-accentSurfaceText'
        onClick={() => {
          try {
            onRun(JSON.parse(json));
          } catch (err) {
            onRun({ _error: (err as Error).message });
          }
        }}
      >
        Run {toolId}
      </button>
    </div>
  );
};

const meta: Meta<typeof Playground> = {
  title: 'ui/react-ui-mcp/ToolList',
  component: Playground,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof Playground>;

export const Default: Story = {};

/**
 * Composition story — show the same data via custom row content (just
 * titles, no descriptions) to verify the namespace API.
 */
export const TitlesOnly: Story = {
  render: () => (
    <div className={GRID_LAYOUT}>
      <PaneTools>
        <ToolList.Root selectedId={SAMPLE_TOOLS[0].id}>
          <ToolList.Content
            tools={SAMPLE_TOOLS}
            renderItem={(tool) => (
              <ToolList.Item key={tool.id} tool={tool}>
                <ToolList.ItemTitle>{tool.title}</ToolList.ItemTitle>
              </ToolList.Item>
            )}
          />
        </ToolList.Root>
      </PaneTools>
      <PaneForm>
        <p className='text-sm text-subdued'>Form pane.</p>
      </PaneForm>
      <PaneResults>
        <p className='text-sm text-subdued'>Results pane.</p>
      </PaneResults>
    </div>
  ),
};
