//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { MermaidEngine, type Scene, Uml, UmlEngine, UmlGrid, UmlRules, UmlSearch } from '#model';

import { SceneSvg } from './SceneSvg';

const CLASS_DIAGRAM = trim`
  classDiagram
      direction TB

      class Dialect {
          <<interface>>
          +id: string
          +compile(input) Command[]
      }

      class Scene {
          +objects: WorldObject[]
      }

      class WorldObject {
          +id: string
          +origin: Point
          +elements: Element[]
      }

      class DrawingBuilder {
          +read(canvas) Scene
          +apply(canvas, commands) void
      }

      class TldrawBuilder
      class ExcalidrawBuilder

      Dialect ..> Scene : compiles to
      Scene *-- WorldObject
      DrawingBuilder ..> Scene : reads / applies
      DrawingBuilder <|.. TldrawBuilder
      DrawingBuilder <|.. ExcalidrawBuilder
`;

/** Denser graph (fan-in/fan-out and cross-links) where crossing minimization becomes visible. */
const COMPLEX_DIAGRAM = trim`
  classDiagram
      direction TB

      class Node {
          <<abstract>>
          +id: string
      }
      class Container
      class Leaf
      class Registry
      class Index
      class Query
      class Store
      class Cache
      class Codec

      Node <|-- Container
      Node <|-- Leaf
      Container *-- Node : children
      Registry o-- Node
      Index ..> Registry
      Query ..> Index
      Query ..> Store
      Store *-- Cache
      Store ..> Codec
      Registry ..> Codec
      Container ..> Store
`;

type LayoutKind = 'grid' | 'layered' | 'dagre' | 'elk' | 'rules' | 'search' | 'flowchart';

/** Block diagram with subgraphs, exercising the compound-graph flowchart engine. */
const FLOWCHART = trim`
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
    Mesh -->|sync| Edge
    Edge --> Echo
`;

type StoryArgs = {
  source: string;
  /** Placement: hand-rolled grid/layered, or engine-backed (dagre | elk) on the same grid cells. */
  layout: LayoutKind;
  /** Fixed cell width (grid layouts only); measured from content when unset. */
  cellWidth?: number;
  /** Fixed cell height (grid layouts only); measured from content when unset. */
  cellHeight?: number;
  /** Fixed header height (grid layouts only); measured from the title text when unset. */
  headerHeight?: number;
  /** Enable click / shift-click selection and show the selected ids. */
  selectable?: boolean;
};

const objectsOf = (commands: Scene.Command[]): Scene.WorldObject[] =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const DefaultStory = ({ source, layout, cellWidth, cellHeight, headerHeight, selectable }: StoryArgs) => {
  const [objects, setObjects] = useState<Scene.WorldObject[]>([]);
  const [selection, setSelection] = useState<readonly string[]>([]);
  const [activated, setActivated] = useState<string>();
  // Async: the ELK engine returns a promise; the sync dialects resolve immediately.
  useEffect(() => {
    let cancelled = false;
    const options = { cell: { w: cellWidth, h: cellHeight }, titleHeight: headerHeight };
    const commands =
      layout === 'flowchart'
        ? MermaidEngine.compile(source)
        : layout === 'layered'
          ? Promise.resolve(Uml.compile(source))
          : layout === 'grid'
            ? Promise.resolve(UmlGrid.compile(source, options))
            : layout === 'rules'
              ? Promise.resolve(UmlRules.compile(source, options))
              : layout === 'search'
                ? Promise.resolve(UmlSearch.compile(source, options))
                : UmlEngine.compile(source, { ...options, engine: layout });
    void commands.then((resolved) => {
      if (!cancelled) {
        setObjects(objectsOf(resolved));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [source, layout, cellWidth, cellHeight, headerHeight]);

  return (
    <div className='dx-fill grid grid-rows-[1fr_auto]'>
      <SceneSvg
        classNames='dx-attention-surface'
        objects={objects}
        grid={layout !== 'layered' ? UmlGrid.GRID : undefined}
        selection={selectable ? selection : undefined}
        onSelectionChange={selectable ? setSelection : undefined}
        onActivate={selectable ? setActivated : undefined}
      />
      {selectable && (
        <div className='p-2 text-xs font-mono text-neutral-500' data-testid='scene-svg.status'>
          selected: [{selection.join(', ')}]{activated ? ` · activated: ${activated}` : ''}
        </div>
      )}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-illustrator/components/SceneSvg',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    layout: { control: 'select', options: ['grid', 'layered', 'dagre', 'elk', 'rules', 'search', 'flowchart'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** UML definition rendered straight to SVG via the grid dialect — no canvas editor involved. */
export const Default: Story = {
  args: {
    source: CLASS_DIAGRAM,
    layout: 'grid',
  },
};

/** Flowchart with subgraphs: ELK compound placement, frames recomputed from snapped members. */
export const Flowchart: Story = {
  args: {
    source: FLOWCHART,
    layout: 'flowchart',
    selectable: true,
  },
};

/** Click selects a class, shift-click toggles, the background clears; double-click activates. */
export const Selection: Story = {
  args: {
    source: CLASS_DIAGRAM,
    layout: 'elk',
    selectable: true,
  },
};

/** The compact layered dialect through the same renderer; arrows resolve their bound refs. */
export const Layered: Story = {
  args: {
    source: CLASS_DIAGRAM,
    layout: 'layered',
  },
};

/** dagre placement (network-simplex + median sweep) on the same grid cells and Z-routing. */
export const Dagre: Story = {
  args: {
    source: COMPLEX_DIAGRAM,
    layout: 'dagre',
  },
};

/** ELK layered placement (layer sweep + Brandes-Köpf) — the constraint-capable engine. */
export const Elk: Story = {
  args: {
    source: COMPLEX_DIAGRAM,
    layout: 'elk',
  },
};

/** The hand-rolled barycenter pass on the dense graph, for side-by-side comparison. */
export const GridComplex: Story = {
  args: {
    source: COMPLEX_DIAGRAM,
    layout: 'grid',
  },
};

/**
 * Rule-based grouping: the inheritance tree (Node/Container/Leaf) renders as a tree, the longest
 * dependency chain (Query → Index → Registry → Codec) as an arrows-up column, each in its own
 * framed group; leftovers pack around them.
 */
export const Rules: Story = {
  args: {
    source: COMPLEX_DIAGRAM,
    layout: 'rules',
  },
};

/**
 * Scored placement search: the chain anchors the center; groups place next to their neighbours
 * where the score (+1 straight, −1 crossing) is highest; the better of {search, packing} wins.
 */
export const Search: Story = {
  args: {
    source: COMPLEX_DIAGRAM,
    layout: 'search',
  },
};
