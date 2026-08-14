//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { type Filter, Tag } from '@dxos/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Employer, Organization, Person, Pipeline } from '@dxos/types';

import { translations } from '#translations';

import { QueryEditor, type QueryEditorProps } from './QueryEditor';

// Create tags at render time to avoid Storybook serialization issues with ECHO objects.
const createTags = (): Tag.Map => ({
  tag_1: Tag.make({ label: 'Important' }),
  tag_2: Tag.make({ label: 'Investor' }),
  tag_3: Tag.make({ label: 'New' }),
});

const meta = {
  title: 'ui/react-ui-components/QueryEditor',
  component: QueryEditor,
  render: (args: QueryEditorProps) => {
    const { space } = useClientStory();
    const [filter, setFilter] = useState<Filter.Any>();
    // Create tags and builder at render time to avoid Storybook serialization issues.
    const tags = useMemo(() => args.tags ?? createTags(), [args.tags]);

    // The editor parses the DSL itself; a story that rebuilt the filter here would be exercising its
    // own `QueryBuilder` rather than the component's.
    const handleFilterChange = useCallback<NonNullable<QueryEditorProps['onFilterChange']>>(
      ({ filter }) => setFilter(filter),
      [],
    );

    return (
      <div className='flex flex-col gap-2'>
        <Toolbar.Root>
          <QueryEditor {...args} db={space?.db} tags={tags} onFilterChange={handleFilterChange} />
        </Toolbar.Root>

        <JsonHighlighter data={filter} classNames='text-xs' />
      </div>
    );
  },
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'p-2', scroll: true }),
    withClientProvider({
      types: [Organization.Organization, Person.Person, Pipeline.Pipeline, Employer.Employer],
      createIdentity: true,
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Simple: Story = {
  args: {
    value: '#important',
  },
};

export const Complex: Story = {
  args: {
    autoFocus: true,
    value: '#important OR type:org.dxos.type.person AND { title: "DXOS", value: true }',
  },
};

export const Relation: Story = {
  args: {
    autoFocus: true,
    value: '(type:org.dxos.type.person -> type:org.dxos.type.organization)',
  },
};

export const Tags: Story = {
  args: {
    autoFocus: true,
    value: 'type:org.dxos.type.person #investor #new',
  },
};
