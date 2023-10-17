//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ThreadChannel } from './ThreadChannel';
import { FullscreenDecorator } from '../../testing';

// TODO(burdon): Client/Space decorator.
const Story = () => <div>ThreadChannel</div>;

export default {
  component: ThreadChannel,
  decorators: [FullscreenDecorator('bg-neutral-200 dark:bg-neutral-800')],
  render: Story,
};

export const Default = {
  args: {},
};
