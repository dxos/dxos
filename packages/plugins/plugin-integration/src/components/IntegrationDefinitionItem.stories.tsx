//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { List } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { IntegrationDefinitionItem } from './IntegrationDefinitionItem';
import { TEST_INTEGRATIONS } from '../testing';
import translations from '../translations';

export const Default = {};

const meta: Meta<typeof IntegrationDefinitionItem> = {
  title: 'plugins/plugin-integration/IntegrationDefinitionItem',
  component: IntegrationDefinitionItem,
  render: (args) => {
    return (
      <List>
        <IntegrationDefinitionItem {...args} />
      </List>
    );
  },
  decorators: [withTheme, withLayout({ tooltips: true })],
  args: {
    integration: faker.helpers.arrayElement(TEST_INTEGRATIONS),
    onConfigure: console.log,
  },
  parameters: {
    translations,
  },
};

export default meta;
