//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Board, type BoardModel, Focus, Mosaic } from '@dxos/react-ui-mosaic';
import { TestColumn, TestItem } from '@dxos/react-ui-mosaic/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person, Pipeline } from '@dxos/types';
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

  const model = useMemo<BoardModel<TestColumn, TestItem>>(() => {
    return {
      isColumn: (obj: Obj.Unknown): obj is TestColumn => obj instanceof TestColumn,
      isItem: (obj: Obj.Unknown): obj is TestItem => obj instanceof TestItem,
      getColumns: () => columns,
      getItems: (column: TestColumn) => column.items,
    } satisfies BoardModel<TestColumn, TestItem>;
  }, [columns]);

  return (
    <Mosaic.Root asChild debug={debug}>
      <div className={mx('grid overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}>
        <Board.Root id='board' model={model} debug={debug} />

        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <Toolbar.Root classNames='border-be border-separator'>
              <IconButton
                icon='ph--arrows-clockwise--regular'
                iconOnly
                label='refresh'
                onClick={() => setColumns([...columns])}
              />
            </Toolbar.Root>
            <Board.Debug classNames='p-2' />
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
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<{ title?: string; content?: string }>(() => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [TestColumn, TestItem, Organization.Organization, Person.Person, Pipeline.Pipeline],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              yield* Effect.promise(() => client.spaces.waitUntilReady());
              yield* Effect.promise(() => client.spaces.default.waitUntilReady());
              const space = client.spaces.default;

              const factory = createObjectFactory(space.db, generator);
              yield* Effect.promise(() =>
                factory([
                  { type: Organization.Organization, count: 20 },
                  { type: Person.Person, count: 30 },
                  { type: Pipeline.Pipeline, count: 10 },
                ]),
              );
            }),
        }),
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
function PreviewPlugin() {
  throw new Error('Function not implemented.');
}
