//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import * as Context from 'effect/Context';
import React, { type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { setupPluginManager } from '@dxos/app-framework/testing';
import { PluginManagerProvider } from '@dxos/app-framework/ui';
import { fromHost } from '@dxos/client/local';
import { Space as HaloSpace, Identity } from '@dxos/halo';
import { makeIdentityService, makeSpaceService } from '@dxos/halo-adapter-client';
import { HaloProvider } from '@dxos/halo-react';
import { invariant } from '@dxos/invariant';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Client, ClientProvider } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { ViewStateProvider } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';

import { runScenarioHeadless } from './scenario-executor.tsx';
import { reviewScenarios } from './scenarios.ts';

/**
 * Runs every {@link reviewScenarios} definition through the headless executor. The SAME definitions
 * run against the full plugin stack in the storybook plays, so the two tiers cannot drift.
 */
describe('review scenarios (headless)', () => {
  let client: Client;
  let space: Space;
  let identity: { did: string };

  beforeEach(async () => {
    client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([Markdown.Document, Text.Text]);
    space = await client.spaces.create();
    const did = client.halo.identity.get()?.did;
    invariant(did, 'identity not initialized');
    identity = { did };
  });

  afterEach(async () => {
    await client.destroy();
  });

  // Mirrors plugin-client's ReactContext: the plugin manager the binding hooks read capabilities
  // from, ClientProvider, plus the HALO services adapter so `useIdentity` resolves inside the hook.
  // No plugins are registered — the review-render-policy capability stays unregistered, so the
  // scenarios run against the default policy.
  const pluginManager = setupPluginManager();
  const wrapper = ({ children }: PropsWithChildren) => (
    <PluginManagerProvider value={pluginManager}>
      <ClientProvider client={client}>
        <HaloProvider
          services={Context.empty().pipe(
            Context.add(Identity.Service, makeIdentityService(client)),
            Context.add(HaloSpace.Service, makeSpaceService(client)),
          )}
        >
          <ViewStateProvider>{children}</ViewStateProvider>
        </HaloProvider>
      </ClientProvider>
    </PluginManagerProvider>
  );

  for (const scenario of reviewScenarios) {
    test(scenario.name, async () => {
      await runScenarioHeadless(scenario, { client, space, identity, wrapper, expect });
    });
  }
});
