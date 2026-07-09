//
// Copyright 2023 DXOS.org
//

import { rmSync } from 'node:fs';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Runtime from 'effect/Runtime';
import * as Scope from 'effect/Scope';
import { afterEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, latch } from '@dxos/async';
import { type ClientServices, makeInProcessClientServicesRpc, makeServicesFromRpc } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { verifyPresentation } from '@dxos/credentials';
import { EffectEx } from '@dxos/effect';
import { type PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { isNode } from '@dxos/util';

import { createMockCredential, createServiceHost } from '../testing';

/**
 * Bridges a host's effect-rpc {@link ClientServices} handlers to the Promise/`Stream` shaped
 * {@link ClientServices} surface the assertions consume, in-process (no wire hop). The scope closing
 * the bridge is torn down when the test finishes.
 */
const makeProxyServices = async (host: ReturnType<typeof createServiceHost>): Promise<Partial<ClientServices>> => {
  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
  const rpc = await EffectEx.runPromise(makeInProcessClientServicesRpc(() => host.services).pipe(Scope.extend(scope)));
  return makeServicesFromRpc(rpc, Runtime.defaultRuntime);
};

describe('ClientServicesHost', () => {
  const dataRoot = '/tmp/dxos/client-services/service-host/storage';

  afterEach(async () => {
    // Clean up.
    isNode() && rmSync(dataRoot, { recursive: true, force: true });
  });

  test('open and close', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open(new Context());
    await host.close(Context.default());
  });

  test('queryCredentials', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open(new Context());
    onTestFinished(() => host.close(Context.default()));
    const services = await makeProxyServices(host);

    await services.IdentityService!.createIdentity({});
    const { spaceKey } = await services.SpacesService!.createSpace({ membershipPolicy: MembershipPolicy.INVITE });

    const stream = services.SpacesService!.queryCredentials({ spaceKey });
    const [done, tick] = latch({ count: 3 });
    stream.subscribe((credential) => {
      tick();
      // console.log(credential);
    });
    onTestFinished(() => stream.close());

    await done();
  });

  test('write and query credentials', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open(new Context());
    onTestFinished(() => host.close(Context.default()));
    const services = await makeProxyServices(host);

    await services.IdentityService!.createIdentity({});

    const testCredential = await createMockCredential({
      signer: host.context.keyring,
      issuer: host.context.identityManager.identity!.deviceKey,
    });

    // Test if Identity exposes haloSpace key.
    const haloSpace = new Trigger<PublicKey>();
    services.IdentityService!.queryIdentity()!.subscribe(({ identity }) => {
      if (identity?.spaceKey) {
        haloSpace.wake(identity.spaceKey);
      }
    });

    await services.SpacesService?.writeCredentials({
      spaceKey: await haloSpace.wait(),
      credentials: [testCredential],
    });

    const credentials = services.SpacesService!.queryCredentials({ spaceKey: await haloSpace.wait() });
    const queriedCredential = new Trigger<Credential>();
    credentials.subscribe((credential) => {
      if (credential.subject.id.equals(testCredential.subject.id)) {
        queriedCredential.wake(credential);
      }
    });
    onTestFinished(() => credentials.close());

    await queriedCredential.wait();
  });

  test('sign presentation', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open(new Context());
    onTestFinished(() => host.close(Context.default()));
    const services = await makeProxyServices(host);

    await services.IdentityService!.createIdentity({});

    const testCredential = await createMockCredential({
      signer: host.context.keyring,
      issuer: host.context.identityManager.identity!.deviceKey,
    });

    const nonce = new Uint8Array([0, 0, 0, 0]);

    const presentation = await services.IdentityService!.signPresentation({
      presentation: {
        credentials: [testCredential],
      },
      nonce,
    });

    expect(presentation.proofs?.[0].nonce).to.deep.equal(nonce);
    expect(await verifyPresentation(presentation)).to.deep.equal({
      kind: 'pass',
    });
  });

  test('storage reset', async () => {
    const config = new Config({
      runtime: { client: { storage: { persistent: true, dataRoot } } },
    });
    {
      const host = createServiceHost(config, new MemorySignalManagerContext());
      await host.open(new Context());
      const services = await makeProxyServices(host);

      await services.IdentityService?.createIdentity({});

      await asyncTimeout(host.reset(), 1000);
      await host.close(Context.default());
    }

    {
      const host = createServiceHost(config, new MemorySignalManagerContext());
      await host.open(new Context());
      const services = await makeProxyServices(host);
      const trigger = new Trigger<Identity>();

      const stream = services.IdentityService?.queryIdentity();
      await stream?.waitUntilReady();

      stream?.subscribe((identity) => {
        if (identity.identity) {
          trigger.wake(identity.identity);
        }
      });
      await expect(asyncTimeout(trigger.wait(), 200)).rejects.toBeInstanceOf(Error);
      await stream?.close();
      await host.close(Context.default());
    }
  });
});
