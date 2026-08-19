//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { type Scene, Uml, UmlGrid } from '#model';

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

type StoryArgs = {
  source: string;
  /** Grid layout (equal cells, orthogonal connectors) vs the compact layered layout. */
  layout: 'grid' | 'layered';
  /** Fixed cell width (grid layout only); measured from content when unset. */
  cellWidth?: number;
  /** Fixed cell height (grid layout only); measured from content when unset. */
  cellHeight?: number;
  /** Fixed header height (grid layout only); measured from the title text when unset. */
  headerHeight?: number;
};

const DefaultStory = ({ source, layout, cellWidth, cellHeight, headerHeight }: StoryArgs) => {
  const objects = useMemo(() => {
    const commands =
      layout === 'grid'
        ? UmlGrid.compile(source, { cell: { w: cellWidth, h: cellHeight }, titleHeight: headerHeight })
        : Uml.compile(source);
    return commands.flatMap((command): Scene.WorldObject[] => (command.op === 'upsert-object' ? [command.object] : []));
  }, [source, layout, cellWidth, cellHeight, headerHeight]);

  return (
    <SceneSvg classNames='dx-attention-surface' objects={objects} grid={layout === 'grid' ? UmlGrid.GRID : undefined} />
  );
};

const meta = {
  title: 'plugins/plugin-illustrator/components/SceneSvg',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
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

/** The compact layered dialect through the same renderer; arrows resolve their bound refs. */
export const Layered: Story = {
  args: {
    source: CLASS_DIAGRAM,
    layout: 'layered',
  },
};
