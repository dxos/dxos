//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { BlueprintEditor } from './BlueprintEditor';
import { RESEARCH_BLUEPRINT_DEFINITION } from '../../testing';
import translations from '../../translations';

const meta: Meta<typeof BlueprintEditor> = {
  title: 'plugins/plugin-assistant/BlueprintEditor',
  component: BlueprintEditor,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'mli-auto max-is-[50rem] justify-center' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof BlueprintEditor>;

export const Default: Story = {
  args: {
    blueprint: RESEARCH_BLUEPRINT_DEFINITION,
  },
};
