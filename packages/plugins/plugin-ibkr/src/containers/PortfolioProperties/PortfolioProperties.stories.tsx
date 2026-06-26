//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Operation, Trigger } from '@dxos/compute';
import { Feed, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Ibkr } from '../../types';
import { PortfolioProperties } from './PortfolioProperties';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [portfolio] = useQuery(space?.db, Filter.type(Ibkr.Portfolio));
  if (!portfolio) {
    return <Loading />;
  }
  return <PortfolioProperties subject={portfolio} />;
};

const meta = {
  title: 'plugins/plugin-ibkr/PortfolioProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Ibkr.Portfolio, Feed.Feed, Trigger.Trigger, Operation.PersistentOperation],
      onCreateSpace: async ({ space }) => {
        space.db.add(Ibkr.makePortfolio({ name: 'Story portfolio' }));
      },
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
