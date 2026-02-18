//
// Copyright 2023 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useContext, useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Database, Obj, Ref } from '@dxos/echo';
import { ClientPlugin, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Board, type BoardModel, Focus, Mosaic } from '@dxos/react-ui-mosaic';
import { TestColumn, TestItem } from '@dxos/react-ui-mosaic/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { Organization, Person, Pipeline } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

const generator = faker as any as ValueGenerator;

faker.seed(999);

type StoryProps = {
  columns?: number;
  debug?: boolean;
};

const createColumns = (count: number, db: Database.Database) =>
  Array.from({ length: count }).map((_, i) => {
    const col = Obj.make(TestColumn, {
      name: `Column ${i}`,
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
  });

const DefaultStory = ({ columns: columnsProp = 1, debug = false }: StoryProps) => {
  const [space] = useSpaces();
  const db = space.db;
  const registry = useContext(RegistryContext);

  const { model, columnsAtom } = useMemo(() => {
    const columnsAtom = Atom.make(createColumns(columnsProp, db));
    const itemsAtomFamily = Atom.family((column: TestColumn) =>
      Atom.make(() => (column.items ?? []).map((ref) => ref.target).filter((item): item is TestItem => item != null)),
    );

    const model: BoardModel<TestColumn, TestItem> = {
      getId: (data: TestColumn | TestItem) => data.id,
      isColumn: (obj: unknown): obj is TestColumn => Obj.isObject(obj) && Obj.instanceOf(TestColumn, obj),
      isItem: (obj: unknown): obj is TestItem => Obj.isObject(obj) && Obj.instanceOf(TestItem, obj),
      columns: columnsAtom,
      items: (column) => itemsAtomFamily(column),
      getColumns: () => registry.get(columnsAtom),
      getItems: (column: TestColumn) => registry.get(itemsAtomFamily(column)),
    };
    return { model, columnsAtom };
  }, [columnsProp, db, registry]);

  return (
    <Mosaic.Root asChild debug={debug}>
      <div className={mx('grid overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}>
        <Board.Root model={model}>
          <Board.Content id='board' debug={debug} />
        </Board.Root>

        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <Toolbar.Root classNames='border-be border-separator'>
              <IconButton
                icon='ph--arrows-clockwise--regular'
                iconOnly
                label='refresh'
                onClick={() => registry.set(columnsAtom, [...registry.get(columnsAtom)])}
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
    withRegistry,
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
