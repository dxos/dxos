//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { RESEARCH_SEQUENCE_DEFINITION } from '../../testing';
import { translations } from '../../translations';

import { SequenceEditor } from './SequenceEditor';

const meta: Meta<typeof SequenceEditor> = {
  title: 'plugins/plugin-assistant/SequenceEditor',
  component: SequenceEditor,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'mli-auto max-is-[50rem] justify-center' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof SequenceEditor>;

export const Default: Story = {
  args: {
    sequence: RESEARCH_SEQUENCE_DEFINITION,
  },
};
