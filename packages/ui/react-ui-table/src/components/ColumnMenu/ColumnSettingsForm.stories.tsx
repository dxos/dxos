//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { ColumnSettingsForm, type ColumnSettingsFormProps } from './ColumnSettingsForm';
import { type TableDef } from '../../schema';

export default {
  title: 'react-ui-table/ColumnSettingsForm',
  component: ColumnSettingsForm,
  decorators: [withTheme],
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

const defaultArgs: ColumnSettingsFormProps = {
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

const Template = (args: ColumnSettingsFormProps) => (
  <div className='p-4 max-is-64'>
    <ColumnSettingsForm {...args} />
  </div>
);

export const Interactive = Template.bind({});
(Interactive as any).args = defaultArgs;
