//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { TextB } from '@phosphor-icons/react';
import React from 'react';

import { Toggle } from './Toggle';
import { withTheme } from '../../testing';

type StorybookToggleProps = {};

const StorybookToggle = (props: StorybookToggleProps) => {
  return (
    <Toggle {...props}>
      <TextB />
    </Toggle>
  );
};

export default {
  title: 'DXOS UI/Toggle button',
  component: StorybookToggle,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
