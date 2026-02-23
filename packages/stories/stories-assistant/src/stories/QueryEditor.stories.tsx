//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Obj, Tag } from '@dxos/echo';
import { translations } from '@dxos/plugin-assistant';
import { D3ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { ScrollArea } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { QueryEditor, type QueryEditorProps, useQueryBuilder } from '@dxos/react-ui-components';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { render } from '@dxos/storybook-utils';
import { Employer, Organization, Person, Pipeline } from '@dxos/types';

// TODO(burdon): Move.

faker.seed(1);
const generator = faker as any as ValueGenerator;

const DefaultStory = ({ value: valueProp }: QueryEditorProps) => {
  const { space } = useClientStory();
  const [query, setQuery] = useState<string | undefined>(valueProp);
  const filter = useQueryBuilder(query);
  const objects = useQuery(space?.db, filter).sort(Obj.sort(Obj.sortByTypename, Obj.sortByLabel));
  const model = useGraphModel(space, filter);

  return (
    <div role='none' className='grid grid-cols-2 grow divide-x divide-subdued-separator overflow-hidden'>
      <div className='flex flex-col overflow-hidden'>
        <QueryEditor classNames='p-2 inline-full border-be border-subdued-separator' db={space?.db} onChange={setQuery} />
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {objects.map((object) => (
              <div
                key={object.id}
                className='grid grid-cols-3 gap-2 p-2 border-be border-subdued-separator overflow-hidden'
              >
                <span className='truncate text-sm font-mono'>{object.id}</span>
                <span className='truncate text-sm font-mono'>{Obj.getTypename(object)}</span>
                <span className='truncate'>{Obj.getLabel(object)}</span>
              </div>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
        <div className='p-2 text-right text-info text-xs'>{objects.length}</div>
      </div>
      <D3ForceGraph model={model} />
    </div>
  );
};

const tags: Tag.Map = {
  ['tag_1' as const]: Tag.make({ label: 'Red' }),
  ['tag_2' as const]: Tag.make({ label: 'Green' }),
  ['tag_3' as const]: Tag.make({ label: 'Blue' }),
};

const meta: Meta<typeof QueryEditor> = {
  title: 'stories/stories-assistant/QueryEditor',
  component: QueryEditor,
  render: render(DefaultStory),
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Organization.Organization, Person.Person, Pipeline.Pipeline, Employer.Employer],
      createIdentity: true,
      onCreateIdentity: async ({ client }) => {
        const space = client.spaces.default;
        const createObjects = createObjectFactory(space.db, generator);
        const objects = await createObjects([
          { type: Organization.Organization, count: 30 },
          { type: Pipeline.Pipeline, count: 20 },
          { type: Person.Person, count: 50 },
        ]);
        objects.forEach((obj) => {
          Obj.change(obj, (o) => {
            Obj.getMeta(o).tags = faker.helpers.uniqueArray(Object.keys(tags), faker.number.int(3));
          });
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
