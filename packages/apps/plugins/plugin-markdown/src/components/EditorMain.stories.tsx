//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { EditorMain } from './EditorMain';

const Story = () => <div>editor</div>;

export default {
  title: 'plugin-markdown/EditorMain',
  component: EditorMain,
  decorators: [withTheme],
  render: Story,
  parameters: { layout: 'fullscreen' },
};

export const Default = () => {};
