//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

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
  title: 'DXOS UI/Toggle button group',
  component: StorybookToggleGroup,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    type: 'single',
  },
};
