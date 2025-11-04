//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Filter, Query } from '@dxos/echo';
import { Tag, Type } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { DataType } from '@dxos/schema';

import { translations } from '../../translations';

import { QueryForm, type QueryFormProps } from './QueryForm';

const types = [
  // TODO(burdon): Get label from annotation.
  { value: Type.getTypename(DataType.Organization.Organization), label: 'Organization' },
  { value: Type.getTypename(DataType.Person.Person), label: 'Person' },
  { value: Type.getTypename(DataType.Project.Project), label: 'Project' },
  { value: Type.getTypename(DataType.Employer.Employer), label: 'Employer' },
];

const tags = Tag.createTagList({
  ['tag_1' as const]: Tag.make({ label: 'Important' }),
  ['tag_2' as const]: Tag.make({ label: 'Investor' }),
  ['tag_3' as const]: Tag.make({ label: 'New' }),
});

const meta = {
  title: 'ui/react-ui-components/QueryForm',
  component: QueryForm,
  render: (args: QueryFormProps) => {
    const [query, setQuery] = useState<Query.Any>(Query.select(Filter.nothing()));

    return (
      <div>
        <Toolbar.Root classNames='border-be border-subduedSeparator'>
          <QueryForm {...args} onChange={setQuery} />
        </Toolbar.Root>

        <Json data={query} classNames='p-2 text-xs' />
      </div>
    );
  },
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withClientProvider({
      types: [DataType.Organization.Organization, DataType.Person.Person, DataType.Project.Project, DataType.Employer.Employer],
      createIdentity: true,
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof QueryForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    types,
    tags,
  },
};
