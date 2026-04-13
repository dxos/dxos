//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Config } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { StatusBarActions } from './StatusBarActions';

const meta: Meta<typeof StatusBarActions> = {
  title: 'plugins/plugin-status-bar/containers/StatusBarActions',
  component: StatusBarActions,
  decorators: [
    withTheme(),
    withLayout({
      layout: 'centered',
      classNames: 'w-[calc(var(--dx-complementary-sidebar-size)_-_var(--dx-rail-content))]',
    }),
    withClientProvider({
      config: new Config({
        version: 1,
        runtime: {
          client: {
            storage: {
              persistent: false,
            },
          },
          app: {
            build: {
              version: '0.8.3-beta.b78990fdd5',
              timestamp: '2024-06-01T12:00:00.000Z',
              commitHash: 'b78990fdd5',
            },
            env: {
              DX_ENVIRONMENT: 'development',
            },
          },
          services: {
            edge: {
              url: 'https://edge-dev.dxos.org',
            },
          },
        },
      }),
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
