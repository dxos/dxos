//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { TextB } from '@phosphor-icons/react';
import React from 'react';

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
