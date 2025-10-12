//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { type Filter } from '@dxos/echo';
import { Type, createTagList } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { DataType } from '@dxos/schema';

import { translations } from '../../translations';

import { QueryBuilder, type QueryBuilderProps } from './QueryBuilder';

const types = [
  // TODO(burdon): Get label from annotation.
  { id: Type.getTypename(DataType.Organization), label: 'Organization' },
  { id: Type.getTypename(DataType.Person), label: 'Person' },
  { id: Type.getTypename(DataType.Project), label: 'Project' },
  { id: Type.getTypename(DataType.Employer), label: 'Employer' },
];

const tags = createTagList({
  ['tag_1' as const]: { label: 'Important' },
  ['tag_2' as const]: { label: 'Investor' },
  ['tag_3' as const]: { label: 'New' },
});

const meta = {
  title: 'ui/react-ui-components/QueryBuilder',
  component: QueryBuilder,
  render: (args: QueryBuilderProps) => {
    const [filter, setFilter] = useState<Filter.Any | null>(null);

    return (
      <div>
        <Toolbar.Root classNames='border-b border-subduedSeparator'>
          <QueryBuilder {...args} onFilterChange={setFilter} />
        </Toolbar.Root>

        <Json data={filter} classNames='p-2 text-xs' />
      </div>
    );
  },
  decorators: [
    withTheme,
    withClientProvider({
      types: [DataType.Organization, DataType.Person, DataType.Project, DataType.Employer],
      createIdentity: true,
    }),
  ],
  parameters: {
    layout: 'column',
    translations,
  },
} satisfies Meta<typeof QueryBuilder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    types,
    tags,
  },
};
