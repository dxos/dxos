//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';

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

/** HALO services whose every space has two members. */
const twoMembers: Context.Context<HaloServices> = Context.make(Space.Service, {
  members: () => Stream.make([{} as Space.Member, {} as Space.Member]),
} as unknown as Space.ServiceApi).pipe(Context.add(Identity.Service, {} as Identity.ServiceApi));

describe('CreateConnectionPanel', () => {
  // An OAuth connector starts its flow on Continue, so the warning has to be there before it.
  test('warns that a user connection acts as you before the flow starts', async () => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const onCreateObject = vi.fn();
      render(
        <PluginManagerProvider.Root value={setupPluginManager()}>
          <HaloProvider services={twoMembers}>
            <CreateConnectionPanel
              target={db}
              connectors={connectors}
              onCreateObject={onCreateObject}
              onCancel={() => {}}
            />
          </HaloProvider>
        </PluginManagerProvider.Root>,
      );

      expect(screen.queryByTestId('create-connection-panel.shared-account')).toBeNull();
      fireEvent.click(screen.getByText('GitHub'));

      yield* Effect.promise(() => screen.findByTestId('create-connection-panel.shared-account'));
      expect(onCreateObject).not.toHaveBeenCalled();
    }).pipe(Effect.provide(TestDatabaseLayer()), EffectEx.runPromise);
  });
});
