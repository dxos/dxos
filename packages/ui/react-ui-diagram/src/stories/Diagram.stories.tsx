//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { EditorView, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { Diagram } from '../components';
import { FLOWCHART, projectMermaid } from '../testing';
import { type Overlay, type Point, type Projection } from '../types';

/**
 * Source pane. The DSL is the source of truth, so this is the authoritative editor and the diagram
 * beside it is a projection that re-derives on every keystroke.
 */
const SourceEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineNumbers: true, lineWrapping: false }),
      createThemeExtensions({ themeMode }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
    ],
    [themeMode, onChange],
  );

  const { parentRef } = useTextEditor({ initialValue: value, extensions }, [extensions]);

  return <div ref={parentRef} className='is-full bs-full overflow-auto' />;
};

const DefaultStory = () => {
  const [source, setSource] = useState(FLOWCHART);
  // Pinned positions live outside the DSL, which cannot express them.
  const [overlay, setOverlay] = useState<Overlay>({});

  const diagram = useMemo<Projection>(() => projectMermaid(source), [source]);

  const handleNodeMove = useCallback((id: string, origin: Point) => {
    setOverlay((current) => ({ ...current, positions: { ...current.positions, [id]: origin } }));
  }, []);

  return (
    <div className='grid grid-cols-2 grow min-h-0 overflow-hidden divide-x divide-separator'>
      <div className='flex flex-col min-w-0 min-h-0 overflow-hidden'>
        <div className='px-2 py-1 text-xs text-description border-b border-separator'>mermaid (source of truth)</div>
        <SourceEditor value={source} onChange={setSource} />
      </div>
      <div className='flex flex-col min-w-0 min-h-0 overflow-hidden'>
        <div className='px-2 py-1 text-xs text-description border-b border-separator'>
          projection ({diagram.graph.nodes.length} nodes, {diagram.graph.edges.length} links
          {Object.keys(overlay.positions ?? {}).length > 0 && `, ${Object.keys(overlay.positions ?? {}).length} pinned`}
          )
        </div>
        <Diagram diagram={diagram} overlay={overlay} onNodeMove={handleNodeMove} />
      </div>
    </div>
  );
};

/**
 * The renderer fed a hand-written model with no DSL involved — the test that the tiers are actually
 * decoupled. Also shows compartments and several ports on one side.
 */
const NeutralStory = () => {
  const diagram = useMemo<Projection>(
    () => ({
      graph: {
        nodes: [
          {
            id: 'Shape',
            type: 'node',
            label: 'Shape',
            size: { width: 200, height: 118 },
            compartments: [
              { id: 'fields', label: 'fields', lines: ['id: string', 'bounds: Rect'] },
              { id: 'methods', label: 'methods', lines: ['draw(): void'] },
            ],
            ports: [
              { id: 'n', side: 'top', offset: 0.5 },
              { id: 's', side: 'bottom', offset: 0.5 },
              { id: 'e1', side: 'right', offset: 0.25 },
              { id: 'e2', side: 'right', offset: 0.5 },
              { id: 'e3', side: 'right', offset: 0.75 },
            ],
          },
          {
            id: 'Rect',
            type: 'node',
            label: 'Rect',
            size: { width: 160, height: 84 },
            compartments: [{ id: 'fields', label: 'fields', lines: ['radius: number'] }],
            ports: [
              { id: 'n', side: 'top', offset: 0.5 },
              { id: 's', side: 'bottom', offset: 0.5 },
            ],
          },
        ],
        // Inheritance: the ontology would annotate this kind as vertical-only.
        edges: [
          { id: 'Rect->Shape', type: 'inheritance', source: 'Rect', target: 'Shape', sourcePort: 'n', targetPort: 's' },
        ],
      },
    }),
    [],
  );

  return <Diagram classNames='grow' diagram={diagram} grid='lines' />;
};

const meta = {
  title: 'ui/react-ui-diagram/Diagram',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two columns: the mermaid source on the left, its live projection on the right. */
export const Default: Story = {};

/** Renderer only — a hand-written neutral model, no DSL. */
export const Neutral: Story = { render: () => <NeutralStory /> };
