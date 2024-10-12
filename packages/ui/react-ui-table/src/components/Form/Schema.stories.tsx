//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { type FormProps } from './Form';
import { TestSchema } from './testing';
import translations from '../../translations';

// TODO(burdon): Form editor.
// TODO(burdon): Table editor.
const Story = (props: FormProps) => <div className='flex w-[240px] m-2 p-2 border border-separator rounded'></div>;

export default {
  title: 'react-ui-table/SchemaEditor',
  decorators: [withTheme, withLayout()],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    schema: TestSchema,
  }, // TODO(burdon): !!!
};
