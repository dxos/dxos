//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
// import { D3ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
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

const DefaultStory = ({ value: valueParam }: QueryEditorProps) => {
  const [query, setQuery] = useState(valueParam);
  const [space] = useSpaces();
  const builder = useMemo(() => new QueryBuilder(), []);
  const [filter, setFilter] = useState<Filter.Any>(Filter.everything());
  // TODO(burdon): Catch invalid filter error.
  const objects = useQuery(space, filter);
  // const model = useGraphModel(space, filter);

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
          space={space}
          value={query}
          onChange={setQuery}
        />
      </div>
      {/* <D3ForceGraph model={model} /> */}
      <div className='bs-full overflow-y-auto'>
        {objects.map((object) => (
          <div
            key={object.id}
            className='grid grid-cols-3 gap-2 text-sm p-2 border-b border-subduedSeparator overflow-hidden'
          >
            <span className='truncate text-xs font-mono'>{object.id}</span>
            <span className='truncate text-xs font-mono'>{Obj.getTypename(object)}</span>
            <span className='truncate'>{Obj.getLabel(object)}</span>
          </div>
        ))}
      </div>
      <div className='p-2 text-right text-infoText text-xs'>{objects.length}</div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/QueryPlayground',
  component: QueryEditor,
  render: render(DefaultStory),
  decorators: [
    withClientProvider({
      types: [DataType.Organization, DataType.Person, DataType.Project, DataType.Employer],
      createIdentity: true,
      onCreateIdentity: async ({ client }) => {
        const space = client.spaces.default;
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
    value: '(type:dxos.org/type/Person => type:dxos.org/type/Organization)',
  },
};
