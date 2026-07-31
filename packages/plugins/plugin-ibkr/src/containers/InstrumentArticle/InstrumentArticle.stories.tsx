//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { TRADINGVIEW_SOURCE } from '../../constants';
import { Ibkr } from '../../types';
import { InstrumentArticle } from './InstrumentArticle';

// Fictional instrument only — this is a public repo (never real holdings). IbkrPlugin is intentionally
// not loaded: the OperationInvoker (from ProcessManagerPlugin) resolves, so GetInstrumentFundamentals
// fails fast with NoHandlerError (no SEC network call) and the panel renders its error state.
const DefaultStory = () => {
  const [space] = useSpaces();
  const [instrument] = useQuery(space?.db, Filter.type(Ibkr.Instrument));
  if (!instrument) {
    return <Loading />;
  }

  return <InstrumentArticle role='article' attendableId='story' subject={instrument} />;
};

const meta = {
  title: 'plugins/plugin-ibkr/InstrumentArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Ibkr.Instrument],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              space.db.add(
                Ibkr.makeInstrument({
                  name: 'Acme Corp.',
                  symbol: 'ACME',
                  exchange: 'NASDAQ',
                  keys: [{ source: TRADINGVIEW_SOURCE, id: 'NASDAQ:ACME' }],
                }),
              );
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
