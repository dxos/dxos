//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { TextB, TextItalic } from '@phosphor-icons/react';
import React from 'react';

import { ToggleGroup, ToggleGroupItem, type ToggleGroupProps } from './ToggleGroup';
import { withTheme } from '../../testing';

type StorybookToggleGroupProps = {
  type: ToggleGroupProps['type'];
};

// TODO(burdon): ToggleGroup.Item.
const StorybookToggleGroup = (props: StorybookToggleGroupProps) => {
  return (
    <ToggleGroup {...props}>
      <ToggleGroupItem value='textb'>
        <TextB />
      </ToggleGroupItem>
      <ToggleGroupItem value='texti'>
        <TextItalic />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default {
  title: 'ui/react-ui-core/ToggleGroup',
  component: ToggleGroup,
  render: StorybookToggleGroup,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    type: 'single',
  },
};
