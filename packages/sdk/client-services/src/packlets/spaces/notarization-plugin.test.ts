//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Context } from '@dxos/context';
import { CredentialGenerator } from '@dxos/credentials';
import { EdgeHttpClient } from '@dxos/edge-client';
import { MockFeedWriter } from '@dxos/feed-store/testing';
import { Keyring } from '@dxos/keyring';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Runtime_Client_EdgeFeaturesSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { AdmittedFeed_Designation } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { TestBuilder, type TestConnection, TestPeer } from '@dxos/teleport/testing';

import { NotarizationPlugin, type NotarizationPluginProps } from './notarization-plugin.ts';

class TestAgent extends TestPeer {
  private readonly _ctx = new Context();

  feed = new MockFeedWriter<Credential>();
  notarizationPlugin: NotarizationPlugin;

  constructor(params: NotarizationPluginProps) {
    super();
    this.notarizationPlugin = new NotarizationPlugin(params);
    this.feed.written.on(this._ctx, async ([credential]) => {
      log('written to feed', { credential });
      await this.notarizationPlugin.processCredential(credential);
    });
  }

  enableWriting(): void {
    this.notarizationPlugin.setWriter(this.feed);
  }

  protected override onOpen(connection: TestConnection): Promise<void> {
    log('onOpen');
    connection.teleport.addExtension('dxos.mesh.teleport.notarization', this.notarizationPlugin.createExtension());
    return super.onOpen(connection);
  }

  override async destroy(): Promise<void> {
    await this._ctx.dispose();
    await super.destroy();
    await this.notarizationPlugin.close();
  }
}

describe('NotarizationPlugin', () => {
  test('notarize single credential', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const params = { spaceId: SpaceId.random() };

    // peer0 is there to test retries.
    const [_peer0, peer1, peer2] = await testBuilder.createPeers({ factory: () => new TestAgent(params) });
    peer1.enableWriting();

    peer1.feed.written.on(async ([credential]) => {
      log('mock replication', { credential });
      await peer2.feed.write(credential);
    });

    await testBuilder.connect(_peer0, peer2);

    const keyring = new Keyring();
    const generator = new CredentialGenerator(keyring, await keyring.createKey(), await keyring.createKey());
    const credential = await generator.createFeedAdmission(
      await keyring.createKey(),
      await keyring.createKey(),
      AdmittedFeed_Designation.CONTROL,
    );

    const notarized = peer2.notarizationPlugin.notarize({
      credentials: [credential],
    });

    await testBuilder.connect(peer1, peer2);
    await notarized;

    expect(peer1.feed.messages.map((c) => c.id)).to.deep.eq([credential.id]);
    expect(peer2.feed.messages.map((c) => c.id)).to.deep.eq([credential.id]);
  });

  test('edge notarization keeps retrying past its own HTTP retry budget on a transient failure', async ({ expect }) => {
    // `notarizeCredentials` bounds a single call to a few HTTP attempts; a transient EDGE failure
    // (e.g. "no active agent yet") must not make the plugin give up on EDGE altogether, since a
    // replicant with no reachable peer has no other way to get admitted. Regression for that stall.
    const OLD_ATTEMPT_CEILING = 3; // 1 request + the old MAX_EDGE_RETRIES of 2.

    let notarizeAttempts = 0;
    const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.endsWith('/auth')) {
        return new Response(null, { status: 200 });
      }
      if (url.includes('/notarization') && init?.method === 'POST') {
        notarizeAttempts++;
        // Mirrors `EdgeResponse.failure` for `NotarizationHandler.notarizeCredentials`'s "no active
        // agents yet" case: status 500, `Retry-After` set from `shouldRetryAfter`, no `data`.
        return new Response(JSON.stringify({ success: false, message: 'No active agents in the space.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '0' },
        });
      }
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    const edgeClient = new EdgeHttpClient('https://edge.example.com');
    const plugin = new NotarizationPlugin({
      spaceId: SpaceId.random(),
      edgeClient,
      edgeFeatures: create(Runtime_Client_EdgeFeaturesSchema, { feedReplicator: true }),
    });
    onTestFinished(async () => {
      await plugin.close();
    });

    const keyring = new Keyring();
    const generator = new CredentialGenerator(keyring, await keyring.createKey(), await keyring.createKey());
    const credential = await generator.createFeedAdmission(
      await keyring.createKey(),
      await keyring.createKey(),
      AdmittedFeed_Designation.CONTROL,
    );

    const notarized = plugin.notarize({
      credentials: [credential],
      timeout: 0,
      retryTimeout: 5,
      edgeRetryJitter: 0,
    });

    await vi.waitFor(() => expect(notarizeAttempts).toBeGreaterThan(OLD_ATTEMPT_CEILING), { timeout: 2_000 });

    // Let the still-pending `notarize()` settle so it does not leak retry tasks past the test.
    await plugin.processCredential(credential);
    await notarized;
  });
});
