//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { faker } from '@dxos/random';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { Dialog } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { AddTokenDialog } from './AddTokenDialog';
import { TEST_INTEGRATIONS } from '../testing';
import translations from '../translations';

export const Default = {};

const meta: Meta<typeof AddTokenDialog> = {
  title: 'plugins/plugin-integration/AddTokenDialog',
  component: AddTokenDialog,
  render: (args) => {
    const { space } = useClientProvider();
    if (!space) {
      return <div>Loading...</div>;
    }

    return (
      <Dialog.Root open>
        <AddTokenDialog {...args} space={space} />
      </Dialog.Root>
    );
  },
  decorators: [
    withClientProvider({ createSpace: true }),
    withPluginManager({ plugins: [IntentPlugin()] }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  args: {
    definition: faker.helpers.arrayElement(
      TEST_INTEGRATIONS.filter((integration) => integration.auth?.kind === 'token'),
    ),
  },
  parameters: {
    translations: [...translations, ...formTranslations],
  },
};

export default meta;
