//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type ContentMap, Mermaid, Uml, UmlGrid } from '@dxos/plugin-illustrator/model';
import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { applyCommands } from '#model';
import { Tldraw } from '#types';

import { CanvasComponent } from './Canvas';

const FLOWCHART = trim`
  flowchart TB
      X[X]

      subgraph CORE[" "]
          A[A]
          B[B]
          C[C]

          A --> B
          A --> C
      end

      Y[Y]

      X --> A
      X --> B
      X --> C
      C --> Y
      Y --> C
`;

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
  scale?: number;
  /** Grid layout: equal-size cells on the document grid with orthogonal connectors. */
  grid?: boolean;
};

const DefaultStory = ({ source, scale = 2, grid }: StoryArgs) => {
  const [canvas] = useState(() => {
    const content: ContentMap = {};
    const compile = !Uml.isClassDiagram(source) ? Mermaid.compile : grid ? UmlGrid.compile : Uml.compile;
    applyCommands(content, compile(source, { scale }));
    return createObject(Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content }));
  });

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <CanvasComponent classNames='dx-attention-surface' canvas={canvas} assetsBaseUrl={null} autoCenter />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-tldraw/components/Mermaid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { source: FLOWCHART },
};

/** The UML dialect rendering its own architecture: dialect → scene → variant builders. */
export const ClassDiagram: Story = {
  args: { source: CLASS_DIAGRAM, scale: 1 },
};

/** Grid variant: equal-size nodes aligned to the document grid, orthogonal connectors. */
export const ClassDiagramGrid: Story = {
  args: { source: CLASS_DIAGRAM, scale: 1, grid: true },
};
