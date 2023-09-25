//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { TextB, TextItalic } from '@phosphor-icons/react';
import React from 'react';

import { ToggleGroup, ToggleGroupItem, ToggleGroupProps } from './ToggleGroup';

type StorybookToggleGroupProps = {
  type: ToggleGroupProps['type'];
};

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
  component: StorybookToggleGroup,
};

export const Default = {
  args: {
    type: 'single',
  },
};
