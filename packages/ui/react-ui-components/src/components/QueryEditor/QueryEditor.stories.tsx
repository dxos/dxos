//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { type Filter, type TagMap } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { DataType } from '@dxos/schema';

import { translations } from '../../translations';

import { QueryEditor, type QueryEditorProps } from './QueryEditor';

const tags: TagMap = {
  ['tag_1' as const]: { label: 'Important' },
  ['tag_2' as const]: { label: 'Investor' },
  ['tag_3' as const]: { label: 'New' },
};

const meta = {
  title: 'ui/react-ui-components/QueryEditor',
  component: QueryEditor,
  render: (args: QueryEditorProps) => {
    const [space] = useSpaces();
    const [filter, setFilter] = useState<Filter.Any | null>(null);
    const builder = useMemo(() => new QueryBuilder(tags), []);
    const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>((value) => {
      setFilter(builder.build(value));
    }, []);

    return (
      <div className='flex flex-col gap-2'>
        <QueryEditor
          {...args}
          classNames='is-[40rem] p-2 border border-subduedSeparator rounded-sm'
          space={space}
          onChange={handleChange}
        />

        <Json data={filter} classNames='text-xs' />
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
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Complex: Story = {
  args: {
    autoFocus: true,
    value: '#important OR type:dxos.org/type/Person AND { title: "DXOS", value: true }',
    tags,
  },
};

export const Relation: Story = {
  args: {
    autoFocus: true,
    value: '(type:dxos.org/type/Person -> type:dxos.org/type/Organization)',
    tags,
  },
};

export const Tags: Story = {
  args: {
    autoFocus: true,
    value: 'type:dxos.org/type/Person #investor #new',
    tags,
  },
};
