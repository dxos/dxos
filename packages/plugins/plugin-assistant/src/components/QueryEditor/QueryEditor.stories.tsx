//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { QueryBuilder } from '@dxos/echo-query';
import { D3ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { Filter, useSpaces } from '@dxos/react-client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { ColumnContainer, render, withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { QueryEditor, type QueryEditorProps } from './QueryEditor';

faker.seed(1);
const generator = faker as any as ValueGenerator;

const GraphStory = ({ query: queryParam }: QueryEditorProps) => {
  const [query, setQuery] = useState(queryParam);
  const [space] = useSpaces();
  const viewRef = useRef<EditorView>(null);
  const builder = useMemo(() => new QueryBuilder(), []);
  const [filter, setFilter] = useState<Filter.Any>(Filter.everything());
  // TODO(burdon): Catch invalid filter.
  const objects = useQuery(space, filter);
  const model = useGraphModel(space, filter);

  useEffect(() => {
    if (query) {
      const filter = builder.build(query);
      setFilter(filter ?? Filter.everything());
    } else {
      setFilter(Filter.everything());
    }
  }, [builder, query]);

  return (
    <div role='none' className='flex flex-col bs-full'>
      <div className='p-4'>
        <QueryEditor
          classNames='p-2 is-full border border-subduedSeparator rounded-sm'
          ref={viewRef}
          space={space}
          query={query}
          onQueryUpdate={setQuery}
        />
      </div>
      <D3ForceGraph model={model} />
      <div className='p-2 text-right text-infoText text-xs'>{objects.length}</div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/QueryEditor',
  component: QueryEditor,
  decorators: [
    withClientProvider({
      types: [DataType.Organization, DataType.Person, DataType.Project, DataType.Employer],
      createIdentity: true,
      onCreateIdentity: async ({ client }) => {
        // TODO(burdon): Clean-up.
        await client.spaces.waitUntilReady();
        const space = await client.spaces.default.waitUntilReady();
        const createObjects = createObjectFactory(space.db, generator);
        await createObjects([
          { type: DataType.Organization, count: 30 },
          { type: DataType.Person, count: 50 },
          { type: DataType.Project, count: 20 },
        ]);
      },
    }),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'is-[50rem]', Container: ColumnContainer }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    query: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization) AND { title:"DXOS", value:100 }',
  },
};

export const Relation: Story = {
  render: render(GraphStory),
  args: {
    query: '(type:dxos.org/type/Person => type:dxos.org/type/Organization)',
  },
};
