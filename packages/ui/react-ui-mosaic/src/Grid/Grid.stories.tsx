//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { createDocAccessor, createObject } from '@dxos/echo-db';
import { faker } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { QueryEditor, translations } from '@dxos/react-ui-components';
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

import { Grid, type GridCellProps, type GridViewportProps } from '../Grid';

faker.seed(1);

console.log(translations);

// CONCEPT: Can the entire app be built from a small number of primitives like this?

// MOSAIC: Column based UI (stakkr.ai)
// Multi-column board / Hiararchy (left-to-right) / Infinite canvas / (Graph).
// - Type note, then have AI create history (to the right).
// - Generate test data
// - Query editor
// - Create columns
// - Import/export
// - CRX/MCP
// - Column plugins

// TODO(burdon): Search / Filter / Sort (Tags).
// TODO(burdon): Mobile / CRX.
// TODO(burdon): Content types (Text, Mixed, Image, Form, etc).
// TODO(Burdon): AI / Auto-search.

// TODO(burdon): Key nav / focus.
// TODO(burdon): Menu.
// TODO(burdon): Virtualization?
// TODO(burdon): Use Card for Cell content.
// TODO(burdon): Replace stack? (Or simplify)
// TODO(burdon): Factor out/generalize? (remove deps from dxos/ui-editor)

const Cell: GridCellProps['Cell'] = ({ item, dragging }) => {
  const accessor = useMemo(() => createDocAccessor(item, ['content']), [item]);
  const extensions = useMemo(() => [automerge(accessor)], [accessor]);
  const initialValue = useMemo(() => {
    const doc = accessor.handle.doc();
    return doc ? get(doc, accessor.path) : '';
  }, [accessor]);

  if (dragging) {
    return <div className='truncate'>{initialValue.slice(0, 80)}</div>;
  }

  return (
    <Editor.Content classNames='outline-none' extensions={extensions} initialValue={initialValue} focusable={false} />
  );
};

const DefaultStory = () => {
  const { themeMode } = useThemeContext();

  const { space } = useClientStory();
  const [query, setQuery] = useState<string | undefined>();
  console.log(space);

  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Enter text', tabbable: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
    ],
    [],
  );

  // TODO(burdon): Data model for position? Arrays of refs.
  const [items, setItems] = useState(range(20).map(() => createObject(Text.make(faker.lorem.paragraph()))));

  const handleCellMove = useCallback<NonNullable<GridViewportProps['onCellMove']>>(
    ({ from, to }) => {
      const [item] = items.splice(from, 1);
      items.splice(to, 0, item);
      setItems([...items]);
    },
    [items],
  );

  return (
    <Editor.Root extensions={extensions}>
      <Grid.Root>
        <Grid.Viewport onCellMove={handleCellMove}>
          <Grid.Column classNames='is-[25rem]'>
            <QueryEditor classNames='p-2' db={space?.db} onChange={setQuery} />
          </Grid.Column>
          <Grid.Column classNames='is-[25rem]'>
            <Grid.Stack items={items} Cell={Cell} />
          </Grid.Column>
        </Grid.Viewport>
      </Grid.Root>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Grid',
  render: DefaultStory,
  decorators: [
    withTheme,
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
