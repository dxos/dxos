//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceMember_Role } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Harness from '@dxos/plugin-testing/Harness';
import { InboxAccountRequiredError } from '@dxos/protocols';

import { SpacePlugin } from '#plugin';
import { SpaceOperation } from '#types';

describe('SpaceOperation.AddMembers', () => {
  test('admits a member it could not notify and reports why', async ({ expect }) => {
    const harness = await Harness.createComposerTestApp({ plugins: [ClientPlugin.make({}), SpacePlugin({})] });
    await using _harness = harness;

    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesAvailable);
    const space = await client.spaces.create();
    await space.waitUntilReady();

    client.halo.inbox.sendMessage = async () => {
      throw new InboxAccountRequiredError();
    };

    const key = PublicKey.random().toHex();
    const result = await harness.runPromise(
      Operation.invoke(SpaceOperation.AddMembers, { space, identityKeys: [key], role: SpaceMember_Role.EDITOR }),
    );

    expect(result.admitted).toEqual([key]);
    expect(result.failed).toEqual([]);
    expect(result.notNotified).toEqual([{ key, reason: 'account-required' }]);
    expect(result.joinUrl).not.toEqual('');
  });
});
