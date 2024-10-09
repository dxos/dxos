//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ColumnSettings, type ColumnSettingsProps } from './ColumnSettings';
import { type TableDef } from '../../schema';
import translations from '../../translations';

const Story = (args: ColumnSettingsProps) => (
  <div className='m-2 flex w-[300px]'>
    <ColumnSettings {...args} />
  </div>
);

export default {
  title: 'react-ui-table/ColumnSettings',
  component: ColumnSettings,
  decorators: [withTheme, withLayout()],
  parameters: {
    translations,
  },
  render: Story,
};

const sampleTableDef: TableDef = {
  id: '1',
  name: 'Sample Table',
  columns: [
    { id: 'col-1', prop: 'name', type: 'string', label: 'Name' },
    { id: 'col-2', prop: 'age', type: 'number', label: 'Age', digits: 0 },
  ],
};

const sampleTablesToReference: TableDef[] = [
  sampleTableDef,
  {
    id: '2',
    name: 'Reference Table',
    columns: [
      { id: 'ref-col-1', prop: 'id', type: 'string', label: 'ID' },
      { id: 'ref-col-2', prop: 'description', type: 'string', label: 'Description' },
    ],
  },
];

const defaultArgs: ColumnSettingsProps = {
  column: {
    id: 'col-1',
    prop: 'name',
    type: 'string',
    label: 'Name',
  },
  tableDef: sampleTableDef,
  tablesToReference: sampleTablesToReference,
  onUpdate: (id, column) => console.log('onUpdate', { id, column }),
  onDelete: (id) => console.log('onDelete', id),
  onClose: () => console.log('onClose'),
};

export const Default = {
  args: defaultArgs,
};

export const NumberColumn = {
  args: {
    ...defaultArgs,
    column: {
      id: 'col-2',
      prop: 'age',
      type: 'number',
      label: 'Age',
      digits: 0,
    },
  },
};

export const ReferenceColumn = {
  args: {
    ...defaultArgs,
    column: {
      id: 'col-3',
      prop: 'reference',
      type: 'ref',
      label: 'Reference',
      refTable: '2',
      refProp: 'ref-col-1',
    },
  },
};

export const NewColumn = {
  args: {
    ...defaultArgs,
    column: {
      id: 'new-col',
      prop: '',
      type: 'string',
      label: '',
    },
  },
};
