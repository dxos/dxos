//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { CredentialGenerator } from '@dxos/credentials';
import { EdgeHttpClient } from '@dxos/edge-client';
import { MockHypercoreWriter } from '@dxos/feed-store/testing';
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

  feed = new MockHypercoreWriter<Credential>();
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

  /** A plugin whose only notarization path is EDGE, talking to `notarizeResponse` over a stubbed `fetch`. */
  const setupEdgeOnlyPlugin = async (notarizeResponse: () => Response) => {
    // Scoped to this plugin's own space: a previous test's retry loop can still have a request in
    // flight when the next one stubs `fetch`, and it must not be counted here.
    const spaceId = SpaceId.random();
    let notarizeAttempts = 0;
    const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
      const url = String(input instanceof URL ? input : (input.url ?? input));
      if (url.includes(`/spaces/${spaceId}/notarization`) && init?.method === 'POST') {
        notarizeAttempts++;
        return notarizeResponse();
      }
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    const plugin = new NotarizationPlugin({
      spaceId,
      edgeClient: new EdgeHttpClient('https://edge.example.com'),
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

    return { plugin, credential, attempts: () => notarizeAttempts };
  };

  // `notarizeCredentials` bounds one call to `1 + MAX_EDGE_RETRIES` HTTP attempts.
  const ATTEMPTS_PER_CALL = 3;

  test('edge notarization keeps retrying while EDGE reports the failure retryable', async ({ expect }) => {
    // "No active agents in the space" is EDGE telling the caller the owner's agent is not admitted
    // yet and to come back — a replicant with no reachable peer has no other way in, so the plugin
    // must outlast the per-call budget rather than giving up on EDGE for good.
    const { plugin, credential, attempts } = await setupEdgeOnlyPlugin(
      () =>
        // Mirrors `EdgeResponse.failure` with `shouldRetryAfter`: `Retry-After` set, no `data`.
        new Response(JSON.stringify({ success: false, message: 'No active agents in the space.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '0' },
        }),
    );

    const notarized = plugin.notarize({ credentials: [credential], timeout: 0, retryTimeout: 5, edgeRetryJitter: 0 });
    await vi.waitFor(() => expect(attempts()).toBeGreaterThan(ATTEMPTS_PER_CALL), { timeout: 2_000 });

    // Let the still-pending `notarize()` settle so it does not leak retry tasks past the test.
    await plugin.processCredential(credential);
    await notarized;
  });

  test('edge notarization stops once EDGE rejects the credential outright', async ({ expect }) => {
    // Without `shouldRetryAfter` the failure is a verdict on the credential, not a transient state;
    // retrying it would spin against EDGE forever.
    const { plugin, credential, attempts } = await setupEdgeOnlyPlugin(
      () =>
        new Response(
          JSON.stringify({ success: false, message: 'Credentials were not issued by a known space member.' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    const notarized = plugin.notarize({ credentials: [credential], timeout: 0, retryTimeout: 5, edgeRetryJitter: 0 });
    await vi.waitFor(() => expect(attempts()).toBeGreaterThan(0), { timeout: 2_000 });

    // Long enough that a loop rescheduling at `retryTimeout` would have fired many times over.
    await sleep(200);
    expect(attempts()).toEqual(1);

    await plugin.processCredential(credential);
    await notarized;
  });
});
