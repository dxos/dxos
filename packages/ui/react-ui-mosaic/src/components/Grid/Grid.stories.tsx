//
// Copyright 2025 DXOS.org
//

import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref, Type } from '@dxos/echo';
import { createDocAccessor, createObject } from '@dxos/echo-db';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { ClientPlugin, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { QueryEditor, translations, useQueryBuilder } from '@dxos/react-ui-components';
import { Editor } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person, Project } from '@dxos/types';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { get, isTruthy, range } from '@dxos/util';

const generator = faker as any as ValueGenerator;

import { type DragEventHandler } from '../../hooks';
import { Mosaic, dropHandler } from '../Mosaic';

import { Grid, type GridCellProps } from './Grid';

faker.seed(1);

// CONCEPT: Can the entire app be built from a small number of primitives like this? Zero custom css.

// NEXT
// - Grid data structure.
// - Surface with customized card layout (e.g., drag).
// - Cards with customized drag/menu: form, editor, debug.
// - Drag from search.
// - Menu to delete.

// MOSAIC: Column based UI (stakkr.ai)
// Multi-column board / Hiararchy (left-to-right) / Infinite canvas / (Graph).
// - Type note, then have AI create history (to the right).
// - Generate test data
// - Query editor
// - Create columns
// - Import/export
// - CRX/MCP
// - Column plugins
// - Sidebar/Navigation?

// - Test existing kanban
// TODO(burdon): Search / Filter / Sort (Tags).
// TODO(burdon): Mobile / CRX.
// TODO(burdon): Content types (Text, Mixed, Image, Form, etc).
// TODO(burdon): AI / Auto-search.

// TODO(burdon): Key nav / focus.
// TODO(burdon): Menu.
// TODO(burdon): Virtualization?
// TODO(burdon): Use Card for Cell content.
// TODO(burdon): Replace stack? (Or simplify)
// TODO(burdon): Factor out/generalize? (remove deps from dxos/ui-editor)

const GridData = Schema.Struct({
  objects: Schema.mutable(Schema.Array(Type.Ref(Obj.Any))),
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Grid',
    version: '0.1.0',
  }),
);

interface GridData extends Schema.Schema.Type<typeof GridData> {}

// TODO(burdon): Replace with Surface.
const TextCell: GridCellProps['Cell'] = ({ object, dragging }) => {
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  const extensions = useMemo(() => [automerge(accessor)], [accessor]);
  const initialValue = useMemo(() => {
    const doc = accessor.handle.doc();
    return doc ? get(doc, accessor.path) : '';
  }, [accessor]);

  if (dragging) {
    return <div className='truncate'>{initialValue?.slice(0, 80)}</div>;
  }

  return <Editor.Content extensions={extensions} initialValue={initialValue} focusable={false} />;
};

const DebugCell: GridCellProps['Cell'] = ({ object }) => {
  return (
    <div role='none' className='flex flex-col'>
      <div>{Obj.getLabel(object)}</div>
      <div className='text-xs text-subdued'>{Obj.getTypename(object)}</div>
      <div className='text-xs text-subdued'>{object.id}</div>
    </div>
  );
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Enter text', tabbable: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
    ],
    [],
  );

  const [query, setQuery] = useState<string | undefined>();
  const filter = useQueryBuilder(query);
  const searchObjects = useQuery(space?.db, filter).sort(Obj.sort(Obj.sortByTypename, Obj.sortByLabel));
  const searchHandler = useMemo<DragEventHandler>(
    () => ({
      id: 'search',
      canDrop: () => false,
      onTake: (item, cb) => {
        cb(item.object);
      },
    }),
    [],
  );

  const grid = useMemo(() => {
    if (!space) {
      return;
    }

    return space.db.add(
      Obj.make(GridData, { objects: range(3).map(() => Ref.make(Text.make(faker.lorem.paragraph()))) }),
    );
  }, [space]);
  const _objects = grid?.objects.map((ref) => ref.target).filter(isTruthy);

  // TODO(burdon): Generalize for kanban, board, etc.
  const [objects, setObjects] = useState(range(3).map(() => createObject(Text.make(faker.lorem.paragraph()))));
  const objectHandler = useMemo<DragEventHandler>(() => {
    const containerId = 'notes';
    return {
      id: containerId,
      canDrop: () => true,
      // TODO(burdon): Generalize/factor out.
      onDrop: ({ object, at }) => {
        const current = objects.findIndex(({ id }) => id === object.id);
        if (current !== -1) {
          objects.splice(current, 1);
        }

        const targetIdx =
          at?.containerId === containerId && at?.type === 'item'
            ? objects.findIndex((object) => object.id === at?.id)
            : -1;
        if (targetIdx !== -1) {
          objects.splice(targetIdx + (at && extractClosestEdge(at) === 'bottom' ? 1 : 0), 0, object);
        } else {
          objects.push(object);
        }

        setObjects([...objects]);
      },
      onTake: (item, cb) => {
        const object = objects.find((object) => object.id === item.id);
        if (!object) {
          return;
        }

        cb(object);
      },
    };
  }, [grid, objects]);

  const { extension, update, cancel, drop } = useMemo(() => dropHandler({}), []);
  const documentHandler = useMemo<DragEventHandler>(() => {
    return {
      id: 'document',
      canDrop: () => true,
      onDrag: ({ position }) => {
        update(position);
      },
      onCancel: () => {
        cancel();
      },
      onDrop: ({ object }) => {
        const text = Obj.getLabel(object) ?? 'Link';
        drop({ text, url: object.id });
      },
    };
  }, []);

  // TODO(burdon): Custom drag handler.
  const mainEditorExtensions = useMemo(() => [...extensions, extension], [extensions, extension]);

  return (
    <Mosaic.Root>
      <Editor.Root extensions={mainEditorExtensions}>
        <Grid.Root>
          <Grid.Viewport classNames='flex is-full overflow-x-auto'>
            <div role='none' className='grid grid-flow-col auto-cols-[25rem] gap-4'>
              {/* Search */}
              <Grid.Column>
                <div role='none' className='p-3'>
                  <QueryEditor
                    classNames='border border-subduedSeparator rounded-sm p-2'
                    db={space?.db}
                    onChange={setQuery}
                  />
                </div>
                <Mosaic.Container asChild autoscroll handler={searchHandler}>
                  <Grid.Stack id={searchHandler.id} objects={searchObjects} Cell={DebugCell} canDrag />
                </Mosaic.Container>
              </Grid.Column>

              {/* Canvas */}
              <Grid.Column>
                <Mosaic.Container asChild autoscroll handler={objectHandler}>
                  <Grid.Stack id={objectHandler.id} objects={objects} Cell={TextCell} canDrag canDrop />
                </Mosaic.Container>
              </Grid.Column>

              {/* TODO(burdon): Document. */}
              <Grid.Column>
                <Mosaic.Container handler={documentHandler}>
                  <Editor.Root extensions={mainEditorExtensions}>
                    <Editor.Viewport classNames='p-3'>
                      <Editor.Content
                        initialValue={['# Hello World', '', 'This is a markdown editor.', '', '', ''].join('\n')}
                      />
                    </Editor.Viewport>
                  </Editor.Root>
                </Mosaic.Container>
              </Grid.Column>
            </div>
          </Grid.Viewport>
        </Grid.Root>
      </Editor.Root>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Grid',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'fullscreen' }),
    // withClientProvider({
    //   createIdentity: true,
    //   createSpace: true,
    //   types: [GridData, Organization.Organization, Person.Person, Project.Project],
    //   onCreateSpace: async ({ space }) => {
    //     const factory = createObjectFactory(space.db, generator);
    //     await factory([
    //       { type: Organization.Organization, count: 20 },
    //       { type: Person.Person, count: 30 },
    //       { type: Project.Project, count: 10 },
    //     ]);
    //   },
    // }),
    withPluginManager<{ title?: string; content?: string }>((context) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [GridData, Organization.Organization, Person.Person, Project.Project],
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
        StorybookPlugin(),
        PreviewPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
