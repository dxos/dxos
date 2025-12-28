//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { createDocAccessor, createObject } from '@dxos/echo-db';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
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
import { get, range } from '@dxos/util';

const generator = faker as any as ValueGenerator;

import { type DropEventHandler } from '../../hooks';
import { Mosaic } from '../Mosaic';

import { Grid, type GridCellProps } from './Grid';

faker.seed(1);

// CONCEPT: Can the entire app be built from a small number of primitives like this? Zero custom css.

// TODO(burdon): Universal DND.

// NEXT
// - Test existing kanban
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

// TODO(burdon): Replace with Surface.
const TextCell: GridCellProps['Cell'] = ({ object, dragging }) => {
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  const extensions = useMemo(() => [automerge(accessor)], [accessor]);
  const initialValue = useMemo(() => {
    const doc = accessor.handle.doc();
    return doc ? get(doc, accessor.path) : '';
  }, [accessor]);

  if (dragging) {
    return <div className='truncate'>{initialValue.slice(0, 80)}</div>;
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
  const { space } = useClientStory();
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
  const searchHandler = useMemo<DropEventHandler>(
    () => ({
      id: 'search',
      canDrop: () => false,
    }),
    [],
  );

  // TODO(burdon): Data model for position? Arrays of refs.
  const [objects, setObjects] = useState(range(2).map(() => createObject(Text.make(faker.lorem.paragraph()))));
  const objectHandler = useMemo<DropEventHandler>(
    () => ({
      id: 'notes',
      canDrop: () => true,
      onUpdate: ({ insert, remove }) => {
        // if (insert) {
        //   const idx = objects.findIndex((object) => object.id === insert.id);
        //   if (idx !== -1) {
        //     objects.splice(idx, 1);
        //     setObjects([...objects]);
        //   }
        // }
        // TODO(burdon): Generalize get/remove/add from collections (array/map/position).
        // const from = source.containerId === containerId ? objects.findIndex((object) => object.id === source.id) : -1;
        // const to = container.id === containerId ? objects.findIndex((object) => object.id === target?.id) : -1;
        // console.log('>>>', { source, from, target, to, container });
        // if (from !== -1) {
        //   objects.splice(from, 1);
        // }
        // if (to !== -1) {
        //   objects.splice(to, 0, objects[from]);
        // }
        // setObjects([...objects]);
      },
    }),
    [objects],
  );

  return (
    <Mosaic.Root>
      <Editor.Root extensions={extensions}>
        <Grid.Root>
          <Grid.Viewport>
            {/* Search */}
            <Mosaic.Container handler={searchHandler}>
              <Grid.Column classNames='is-[25rem]'>
                {/* TODO(burdon): Stack layout. */}
                <div role='none' className='p-3'>
                  <QueryEditor
                    classNames='border border-subduedSeparator rounded-sm p-2'
                    db={space?.db}
                    onChange={setQuery}
                  />
                </div>
                <Grid.Stack id={searchHandler.id} objects={searchObjects} Cell={DebugCell} canDrag />
              </Grid.Column>
            </Mosaic.Container>

            {/* Canvas */}
            <Mosaic.Container handler={objectHandler}>
              <Grid.Column classNames='is-[25rem]'>
                <Grid.Stack id={objectHandler.id} objects={objects} Cell={TextCell} canDrag canDrop />
              </Grid.Column>
            </Mosaic.Container>
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
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Organization.Organization, Person.Person, Project.Project],
      onCreateSpace: async ({ space }) => {
        const factory = createObjectFactory(space.db, generator);
        await factory([
          { type: Organization.Organization, count: 20 },
          { type: Person.Person, count: 30 },
          { type: Project.Project, count: 10 },
        ]);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
