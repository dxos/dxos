//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { createObject } from '@dxos/echo-client';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type ContentMap, Ui } from '@dxos/plugin-illustrator/model';
import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { applyCommands } from '#model';
import { Tldraw } from '#types';

import { CanvasComponent } from './Canvas';

// MOSAIC (Model-Oriented System for Adaptive Interface Composition) phase-1 spike: a schema
// compiles to a low-fidelity form schematic — ASCII on the left, the same drawing on the canvas.

const Contact = Schema.Struct({
  name: Schema.String,
  active: Schema.Boolean,
  role: Schema.Literals(['admin', 'member', 'guest']),
  address: Schema.Struct({
    street: Schema.String,
    city: Schema.String,
  }),
  emails: Schema.Array(Schema.String),
  tasks: Schema.Array(
    Schema.Struct({
      title: Schema.String,
      done: Schema.Boolean,
    }),
  ),
}).annotate({ title: 'Contact' });

const DefaultStory = () => {
  const [{ canvas, ascii }] = useState(() => {
    const drawing = Ui.deckOf(Ui.fromSchema(Contact), Ui.schemaTitle(Contact));
    const content: ContentMap = {};
    applyCommands(content, Ui.compile(drawing, { scale: 1.5 }));
    return {
      ascii: Ui.renderAscii(drawing),
      canvas: createObject(Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content })),
    };
  });

  return (
    <div className='grid grid-cols-[20rem_1fr] dx-fill'>
      <pre className='overflow-auto p-4 text-xs border-ie border-separator'>{ascii}</pre>
      <Panel.Root>
        <Panel.Content asChild>
          <CanvasComponent classNames='dx-attention-surface' canvas={canvas} assetsBaseUrl={null} autoCenter />
        </Panel.Content>
      </Panel.Root>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tldraw/components/UiSchematic',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
