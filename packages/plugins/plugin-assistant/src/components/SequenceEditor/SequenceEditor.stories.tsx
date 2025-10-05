//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { RESEARCH_SEQUENCE_DEFINITION } from '../../testing';
import { translations } from '../../translations';

import { SequenceEditor } from './SequenceEditor';

const meta = {
  title: 'plugins/plugin-assistant/SequenceEditor',
  component: SequenceEditor,
  // TODO(wittjosiah): Fix story.
  render: () => <>TODO</>,
  decorators: [withTheme],
  parameters: {
    layout: 'column',
    translations,
  },
} satisfies Meta<typeof SequenceEditor>;

export default meta;

type Story = StoryObj<typeof SequenceEditor>;

export const Default: Story = {
  args: {
    sequence: RESEARCH_SEQUENCE_DEFINITION,
  },
};
