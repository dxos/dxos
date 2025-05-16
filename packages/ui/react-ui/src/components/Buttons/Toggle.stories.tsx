//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { TextB } from '@phosphor-icons/react';
import React from 'react';

import { Toggle } from './Toggle';
import { withTheme } from '../../testing';

type StorybookToggleProps = {};

const DefaultStory = (props: StorybookToggleProps) => {
  return (
    <Toggle {...props}>
      <TextB />
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
