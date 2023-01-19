//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Context } from '@dxos/context';
import { CredentialGenerator } from '@dxos/credentials';
import { MockFeedWriter } from '@dxos/feed-store/testing';
import { Keyring } from '@dxos/keyring';
import { log } from '@dxos/log';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { TestBuilder, TestConnection, TestPeer } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { NotarizationPlugin } from './notarization-plugin';

class TestAgent extends TestPeer {
  private readonly _ctx = new Context();

  feed = new MockFeedWriter<Credential>();
  notarizationPlugin = new NotarizationPlugin();

  constructor() {
    super();
    this.feed.written.on(this._ctx, async ([credential]) => {
      log('written to feed', { credential });
      await this.notarizationPlugin.process(credential);
    });
  }

  enableWriting() {
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
    afterTest(() => testBuilder.destroy());

    // peer0 is there to test retries.
    const [_peer0, peer1, peer2] = await testBuilder.createPeers({ factory: () => new TestAgent() });
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
      AdmittedFeed.Designation.CONTROL
    );

    const notarized = peer2.notarizationPlugin.notarize([credential]);

    await testBuilder.connect(peer1, peer2);
    await notarized;

    expect(peer1.feed.messages.map((c) => c.id)).to.deep.eq([credential.id]);
    expect(peer2.feed.messages.map((c) => c.id)).to.deep.eq([credential.id]);
  });
});
