//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { OnboardingPlugin } from '#plugin';

import { BRAMBLE_TEMPLATE_ID } from '../constants.ts';

const LEGACY_TAG = 'org.dxos.space.exemplar';

describe('demo space migration', () => {
  test('stamps a space that is still opening when the event fires', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), OnboardingPlugin({ generateDemoSpace: false })],
    });
    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesAvailable);

    const space = await client.spaces.create({ name: 'Bramble Coffee Roasters' }, { tags: [LEGACY_TAG] });
    await space.waitUntilReady();

    await expect.poll(() => AppSpace.getSpaceTemplateId(space), { timeout: 30_000 }).toBe(BRAMBLE_TEMPLATE_ID);
    expect(AppSpace.findSpaceFromTemplate(client, BRAMBLE_TEMPLATE_ID)?.id).toBe(space.id);
  });
});
