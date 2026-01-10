//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Focus, Mosaic } from '@dxos/react-ui-mosaic';
import { Board, DebugRoot, TestColumn, TestItem } from '@dxos/react-ui-mosaic/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person, Project } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

const generator = faker as any as ValueGenerator;

faker.seed(999);

type StoryProps = {
  columns?: number;
  debug?: boolean;
};

const DefaultStory = ({ columns: columnsProp = 1, debug = false }: StoryProps) => {
  const [space] = useSpaces();
  const db = space.db;

  const [columns, setColumns] = useState<TestColumn[]>(
    Array.from({ length: columnsProp }).map((_, i) => {
      const col = Obj.make(TestColumn, {
        items: Array.from({ length: faker.number.int({ min: 8, max: 20 }) }).map((_, j) => {
          const item = db.add(
            Obj.make(TestItem, {
              name: faker.lorem.sentence(3),
              description: faker.lorem.paragraph(1),
              label: `${String.fromCharCode(65 + i)}-${j}`,
            }),
          );

          return Ref.make(item);
        }),
      });

      return col;
    }),
  );

  return (
    <Mosaic.Root asChild debug={debug}>
      <div className={mx('grid overflow-hidden', debug && 'grid-cols-[1fr_25rem] gap-2')}>
        <Board id='board' columns={columns} debug={debug} />
        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <Toolbar.Root classNames='border-b border-separator'>
              <IconButton
                icon='ph--arrows-clockwise--regular'
                iconOnly
                label='refresh'
                onClick={() => setColumns([...columns])}
              />
            </Toolbar.Root>
            <DebugRoot classNames='p-2' />
          </Focus.Group>
        )}
      </div>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'stories/stories-ui/MosaicSurface',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<{ title?: string; content?: string }>(() => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Organization.Organization, Person.Person, Project.Project],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            const space = client.spaces.default;

            const factory = createObjectFactory(space.db, generator);
            await factory([
              { type: Organization.Organization, count: 20 },
              { type: Person.Person, count: 30 },
              { type: Project.Project, count: 10 },
            ]);
          },
        }),
        StorybookPlugin({}),
        // PreviewPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // debug: true,
    columns: 3,
  },
};
