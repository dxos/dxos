//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { type Filter, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { DataType } from '@dxos/schema';

import { translations } from '../../translations';

import { QueryEditor, type QueryEditorProps } from './QueryEditor';

const tags: Tag.TagMap = {
  ['tag_1' as const]: Tag.make({ label: 'Important' }),
  ['tag_2' as const]: Tag.make({ label: 'Investor' }),
  ['tag_3' as const]: Tag.make({ label: 'New' }),
};

const meta = {
  title: 'ui/react-ui-components/QueryEditor',
  component: QueryEditor,
  render: (args: QueryEditorProps) => {
    const [space] = useSpaces();
    const [filter, setFilter] = useState<Filter.Any>();
    const builder = useMemo(() => new QueryBuilder(tags), []);
    const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>((value) => {
      setFilter(builder.build(value).filter);
    }, []);

    return (
      <div role='none' className='flex flex-col gap-2'>
        <QueryEditor
          {...args}
          classNames='p-2 border border-subduedSeparator rounded-sm'
          db={space?.db}
          onChange={handleChange}
        />

        <Json data={filter} classNames='text-xs' />
      </div>
    );
  },
  decorators: [
    withTheme,
    withLayout({ container: 'column', classNames: 'p-2', scroll: true }),
    withClientProvider({
      types: [DataType.Organization, DataType.Person, DataType.Project, DataType.Employer],
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
