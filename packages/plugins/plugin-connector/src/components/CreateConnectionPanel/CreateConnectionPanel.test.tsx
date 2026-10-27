//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import { setupPluginManager } from '@dxos/app-framework/testing';
import { Database } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Identity, Space } from '@dxos/halo';
import { HaloProvider, type HaloServices } from '@dxos/halo-react';
import { OAuthProvider } from '@dxos/protocols';

import { type ConnectorEntry } from '../../types/ConnectorSpec.ts';
import { CreateConnectionPanel } from './CreateConnectionPanel.tsx';

const connectors: ConnectorEntry[] = [
  {
    id: 'github',
    source: 'github.com',
    label: 'GitHub',
    kind: 'user',
    oauth: { provider: OAuthProvider.GITHUB, scopes: [] },
  },
  {
    id: 'github-app',
    source: 'github.com',
    label: 'GitHub App',
    kind: 'app',
    oauth: { provider: OAuthProvider.GITHUB, scopes: [] },
  },
];

/** HALO services whose spaces report `members`, or never answer when it is undefined. */
const haloServices = (members?: readonly Space.Member[]): Context.Context<HaloServices> =>
  Context.make(Space.Service, {
    members: () => (members ? Stream.make(members) : Stream.never),
  } as unknown as Space.ServiceApi).pipe(Context.add(Identity.Service, {} as Identity.ServiceApi));

const renderPanel = (db: Database.Database, services: Context.Context<HaloServices>) => {
  const onCreateObject = vi.fn();
  render(
    <PluginManagerProvider.Root value={setupPluginManager()}>
      <HaloProvider services={services}>
        <CreateConnectionPanel
          target={db}
          connectors={connectors}
          onCreateObject={onCreateObject}
          onCancel={() => {}}
        />
      </HaloProvider>
    </PluginManagerProvider.Root>,
  );
  return onCreateObject;
};

describe('CreateConnectionPanel', () => {
  afterEach(cleanup);

  // An OAuth connector starts its flow on Continue, so the warning has to be there before it.
  test('warns that a user connection acts as you before the flow starts', async () => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const onCreateObject = renderPanel(db, haloServices([{} as Space.Member, {} as Space.Member]));

      expect(screen.queryByTestId('create-connection-panel.shared-account')).toBeNull();
      fireEvent.click(screen.getByText('GitHub'));

      yield* Effect.promise(() => screen.findByTestId('create-connection-panel.shared-account'));
      expect(onCreateObject).not.toHaveBeenCalled();
    }).pipe(Effect.provide(TestDatabaseLayer()), EffectEx.runPromise);
  });

  // Until the space's members are known, a user connection could be shared without the warning.
  test('holds a user connection back until the space members are known', async () => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const onCreateObject = renderPanel(db, haloServices());

      fireEvent.click(screen.getByText('GitHub'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(onCreateObject).not.toHaveBeenCalled();
    }).pipe(Effect.provide(TestDatabaseLayer()), EffectEx.runPromise);
  });
});
