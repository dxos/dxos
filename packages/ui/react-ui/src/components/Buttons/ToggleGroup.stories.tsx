//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { ToggleGroup, ToggleGroupItem, type ToggleGroupProps } from './ToggleGroup';
import { withTheme } from '../../testing';
import { Icon } from '../Icon';

// TODO(burdon): Create Radix-style Root, Item, etc?
const DefaultStory = (props: ToggleGroupProps) => {
  return (
    <ToggleGroup {...props}>
      <ToggleGroupItem value='textb'>
        <Icon icon='ph--text-b--regular' />
      </ToggleGroupItem>
      <ToggleGroupItem value='texti'>
        <Icon icon='ph--text-italic--regular' />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default {
  title: 'ui/react-ui-core/ToggleGroup',
  component: ToggleGroup,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    type: 'single',
  },
};
