//
// Copyright ${YEAR} DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

const Story = () => <div>Test</div>;

export default {
  title: 'example/Story',
  component: Story,
  decorators: [withTheme],
};

export const Default = {
  args: {},
};
