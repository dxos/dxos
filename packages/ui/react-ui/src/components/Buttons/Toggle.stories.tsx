//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Toggle } from './Toggle';
import { withTheme } from '../../testing';
import { Icon } from '../Icon';

type StorybookToggleProps = {};

const DefaultStory = (props: StorybookToggleProps) => {
  return (
    <Toggle {...props}>
      <Icon icon='ph--text-b--regular' />
    </Toggle>
  );
};

export default {
  title: 'ui/react-ui-core/Toggle',
  component: Toggle,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
