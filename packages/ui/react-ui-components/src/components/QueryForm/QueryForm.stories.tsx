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
import { Employer, Organization, Person, Project } from '@dxos/types';

import { translations } from '../../translations';

import { QueryForm, type QueryFormProps } from './QueryForm';

const types = [
  // TODO(burdon): Get label from annotation.
  { value: Organization.Organization.typename, label: 'Organization' },
  { value: Person.Person.typename, label: 'Person' },
  { value: Type.getTypename(Project.Project), label: 'Project' },
  { value: Employer.Employer.typename, label: 'Employer' },
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
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Organization.Organization, Person.Person, Project.Project, Employer.Employer],
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
