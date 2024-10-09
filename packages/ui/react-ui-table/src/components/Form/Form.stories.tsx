//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import translations from '../../translations';

const Story = (props: { schema }: ) => (
  <div className='flex w-[240px] m-2 p-2 border border-separator rounded'>
    <Form />
  </div>
);

const Form = () => {
  return <div>Form</div>;
};

export default {
  title: 'react-ui-table/Form',
  decorators: [withTheme, withLayout()],
  parameters: {
    translations,
  },
  render: Story,
};
