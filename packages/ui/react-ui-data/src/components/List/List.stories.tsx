//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { List, type ListProps } from './List';
import { view, TestPopup } from '../../testing';
import translations from '../../translations';
import { FieldSchema, type FieldType } from '../../types';

const Story = (props: ListProps<FieldType>) => (
  <TestPopup>
    <List {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/List',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    items: view.fields,
    schema: FieldSchema,
    getLabel: (field) => field.path,
  } satisfies ListProps<FieldType>,
};
