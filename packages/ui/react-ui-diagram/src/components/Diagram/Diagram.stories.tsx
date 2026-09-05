//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { composable, composableProps, Panel, Toolbar, useComposedRefs, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { EditorView, createBasicExtensions, createMermaidExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { CLASS_DIAGRAM, FLOWCHART, NESTED_FLOWCHART, projectMermaid } from '../../testing';
import { type Overlay, type Point, type Projection } from '../../types';
import { Diagram, type DiagramBackgroundProps } from './Diagram';

/**
 * Source pane. The DSL is the source of truth, so this is the authoritative editor and the diagram
 * beside it is a projection that re-derives on every keystroke. Composable so it is a valid
 * `Panel.Content asChild` target — the editor's own ref is composed with the slot's.
 */
const SourceEditor = composable<HTMLDivElement, { value: string; onChange: (value: string) => void }>(
  ({ value, onChange, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const extensions = useMemo(
      () => [
        createBasicExtensions({ lineNumbers: true, lineWrapping: false }),
        createThemeExtensions({ themeMode }),
        // Standalone mermaid document, so the language goes on at top level. (In a markdown editor
        // it is registered as a fenced-code language instead — see plugin-mermaid.)
        createMermaidExtensions(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
      [themeMode, onChange],
    );

    const { parentRef } = useTextEditor({ initialValue: value, extensions }, [extensions]);
    const ref = useComposedRefs(forwardedRef, parentRef);

    return <div {...composableProps(props, { classNames: 'overflow-auto' })} ref={ref} />;
  },
);

SourceEditor.displayName = 'SourceEditor';

const EMPTY: Projection = { graph: { nodes: [], edges: [] } };

type StoryArgs = {
  /** Mermaid source. When set, the source pane is shown and the projection derives from it. */
  source?: string;
  /** A ready-made projection, for when there is no DSL to derive one from. */
  projection?: Projection;
  background?: DiagramBackgroundProps['variant'];
};

const count = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`;

/**
 * One render for every story. The two branches are the two paths the architecture supports —
 * projected from a dialect, or handed the neutral model directly — so both belong in one harness
 * rather than in stories that share no code.
 */
const DefaultStory = ({ source, projection, background }: StoryArgs) => {
  // `key` remounts the editor so Reset restores the document; CodeMirror owns its own buffer.
  const [{ text, key }, setSource] = useState({ text: source, key: 0 });
  // Pinned positions live outside the DSL, which cannot express them.
  const [overlay, setOverlay] = useState<Overlay>({});

  const resolved = useMemo<Projection>(
    () => (text !== undefined ? projectMermaid(text) : (projection ?? EMPTY)),
    [text, projection],
  );

  const handleNodeMove = useCallback((id: string, origin: Point) => {
    setOverlay((current) => ({ ...current, positions: { ...current.positions, [id]: origin } }));
  }, []);

  const handleChange = useCallback((next: string) => setSource((current) => ({ ...current, text: next })), []);
  const handleReset = useCallback(() => {
    setSource(({ key }) => ({ text: source, key: key + 1 }));
    setOverlay({});
  }, [source]);
  // Discarding the pins returns every node to its computed position.
  const handleRelayout = useCallback(() => setOverlay({}), []);

  const pinned = Object.keys(overlay.positions ?? {}).length;

  return (
    <div className='dx-expand grid' style={{ gridTemplateColumns: text !== undefined ? '1fr 1fr' : '1fr' }}>
      {text !== undefined && (
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton
                icon='ph--arrow-counter-clockwise--regular'
                label='Reset'
                disabled={text === source}
                onClick={handleReset}
              />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            <SourceEditor key={key} value={text} onChange={handleChange} />
          </Panel.Content>
          <Panel.Statusbar classNames='p-2'>
            <span>mermaid ({count(text.split('\n').length, 'line')})</span>
          </Panel.Statusbar>
        </Panel.Root>
      )}

      <Diagram.Root diagram={resolved} overlay={overlay} onNodeMove={handleNodeMove}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <Toolbar.IconButton
                icon='ph--arrows-clockwise--regular'
                label='Re-layout'
                disabled={pinned === 0}
                onClick={handleRelayout}
              />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Diagram.Canvas>
              <Diagram.Background variant={background} />
            </Diagram.Canvas>
          </Panel.Content>
          <Panel.Statusbar classNames='p-2'>
            <span>
              {[
                count(resolved.graph.nodes.length, 'node'),
                count(resolved.graph.edges.length, 'link'),
                ...(pinned > 0 ? [`${pinned} pinned`] : []),
              ].join(', ')}
            </span>
          </Panel.Statusbar>
        </Panel.Root>
      </Diagram.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-diagram/components/Diagram',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Fan-out into a group, plus a `C <-> Y` cycle the ranking has to break. */
export const Default: Story = {
  args: {
    source: FLOWCHART,
  },
};

/** A subgraph inside a subgraph, exercising the layout past one level of nesting. */
export const Nested: Story = {
  args: {
    source: NESTED_FLOWCHART,
  },
};

/** Renderer only — a hand-written neutral model, no DSL. Compartments and several ports per side. */
export const Neutral: Story = {
  args: {
    projection: CLASS_DIAGRAM,
    background: 'lines',
  },
};
