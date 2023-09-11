//
// Copyright 2023 DXOS.org
//

import { TextB } from '@phosphor-icons/react';
import React from 'react';

import '@dxosTheme';

import { Toggle } from './Toggle';

type StorybookToggleProps = {};

const StorybookToggle = (props: StorybookToggleProps) => {
  return (
    <Toggle {...props}>
      <TextB />
    </Toggle>
  );
};

export default {
  component: StorybookToggle,
};

export const Default = {
  args: {},
};
