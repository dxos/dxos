//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { Obj, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { D3ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { Filter, useSpaces } from '@dxos/react-client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import { DataType } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { render } from '@dxos/storybook-utils';

import { translations } from '../translations';

faker.seed(1);
const generator = faker as any as ValueGenerator;

const DefaultStory = ({ value: valueParam }: QueryEditorProps) => {
  const [query, setQuery] = useState(valueParam);
  const [space] = useSpaces();
  const builder = useMemo(() => new QueryBuilder(), []);
  const [filter, setFilter] = useState<Filter.Any>(Filter.everything());
  const objects = useQuery(space, filter).sort(Obj.sort(Obj.sortByTypename, Obj.sortByLabel));
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
    <div role='none' className='grid grid-cols-2 grow divide-x divide-subduedSeparator overflow-hidden'>
      <div className='flex flex-col overflow-hidden'>
        <QueryEditor
          classNames='p-2 is-full border-b border-subduedSeparator'
          space={space}
          value={query}
          onChange={setQuery}
        />
        <div className='bs-full overflow-y-auto'>
          {objects.map((object) => (
            <div
              key={object.id}
              className='grid grid-cols-3 gap-2 p-2 border-b border-subduedSeparator overflow-hidden'
            >
              <span className='truncate text-sm font-mono'>{object.id}</span>
              <span className='truncate text-sm font-mono'>{Obj.getTypename(object)}</span>
              <span className='truncate'>{Obj.getLabel(object)}</span>
            </div>
          ))}
        </div>
        <div className='p-2 text-right text-infoText text-xs'>{objects.length}</div>
      </div>
      <D3ForceGraph model={model} />
    </div>
  );
};

const tags: Record<string, Tag> = {
  ['tag_1' as const]: Tag.make({ label: 'Red' }),
  ['tag_2' as const]: Tag.make({ label: 'Green' }),
  ['tag_3' as const]: Tag.make({ label: 'Blue' }),
};

const meta: Meta<typeof QueryEditor> = {
  title: 'plugins/plugin-assistant/QueryEditor',
  component: QueryEditor,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withClientProvider({
      types: [DataType.Organization, DataType.Person, DataType.Project, DataType.Employer],
      createIdentity: true,
      onCreateIdentity: async ({ client }) => {
        const space = client.spaces.default;
        const createObjects = createObjectFactory(space.db, generator);
        const objects = await createObjects([
          { type: DataType.Organization, count: 30 },
          { type: DataType.Project, count: 20 },
          { type: DataType.Person, count: 50 },
        ]);
        objects.forEach((obj) => {
          Obj.getMeta(obj).tags = faker.helpers.uniqueArray(Object.keys(tags), faker.number.int(3));
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: '(type:dxos.org/type/Person OR type:dxos.org/type/Organization)',
  },
};
