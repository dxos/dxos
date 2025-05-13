//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { live, makeRef } from '@dxos/react-client/echo';
import { List } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { IntegrationItem } from './IntegrationItem';
import { TEST_INTEGRATIONS } from '../testing';
import translations from '../translations';
import { IntegrationType } from '../types';

export const Default = {};

const meta: Meta<typeof IntegrationItem> = {
  title: 'plugins/plugin-integration/IntegrationItem',
  component: IntegrationItem,
  render: (args) => {
    return (
      <List>
        <IntegrationItem {...args} />
      </List>
    );
  },
  decorators: [withTheme, withLayout({ tooltips: true })],
  args: {
    integration: live(IntegrationType, {
      serviceId: TEST_INTEGRATIONS[0].serviceId,
      accessToken: makeRef(
        live(DataType.AccessToken, {
          token: faker.string.uuid(),
          source: TEST_INTEGRATIONS[0].auth!.source,
          note: TEST_INTEGRATIONS[0].auth!.note,
        }),
      ),
    }),
    onRemove: console.log,
  },
  parameters: {
    translations,
  },
};

export default meta;
