//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { IntegrationRegistry, type IntegrationRegistryProps } from './IntegrationRegistry';
import translations from '../translations';

const DefaultStory = ({ classNames, ...args }: ThemedClassName<IntegrationRegistryProps>) => {
  return (
    <div className={mx('flex overflow-hidden', classNames)}>
      <IntegrationRegistry {...args} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-integration/IntegrationRegistry',
  component: IntegrationRegistry,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center' }), withTheme],
  args: {
    classNames: 'w-[30rem]',
    onConfigure: console.log,
  },
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof IntegrationRegistry>;

export const Default: Story = {
  args: {},
};
