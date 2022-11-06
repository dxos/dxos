//
// Copyright 2022 DXOS.org
//

import { pipeline } from 'stream';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { ExtensionContext, Teleport, TeleportExtension } from './teleport';
import { TestExtension } from './test-extension';

const setup = () => {
  const peerId1 = PublicKey.random();
  const peerId2 = PublicKey.random();

  const peer1 = new Teleport({ localPeerId: peerId1, remotePeerId: peerId2 });
  const peer2 = new Teleport({ localPeerId: peerId2, remotePeerId: peerId1 });

  pipeline(peer1.stream, peer2.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  pipeline(peer2.stream, peer1.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  afterTest(() => peer1.close());
  afterTest(() => peer2.close());

  return { peer1, peer2 };
};

describe('Teleport', function () {
  it('test', async function () {
    const { peer1, peer2 } = setup();

    await Promise.all([peer1.open(), peer2.open()]);

    const extension1 = new TestExtension();
    peer1.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    peer2.addExtension('example.testing.rpc', extension2);

    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');
  });
});

class AuthExtension implements TeleportExtension {
  constructor({ onAuthenticated }: { onAuthenticated: () => void }) {}

  async onOpen(context: ExtensionContext): Promise<void> {}

  async onClose(err?: Error): Promise<void> {}
}

class PresenceExtension implements TeleportExtension {
  constructor() {}

  rpc!: ProtoRpcPeer<{}>;

  async onOpen(context: ExtensionContext): Promise<void> {
    this.rpc = createProtoRpcPeer({
      port: context.createPort('rpc')
    } as any);

    await this.rpc.open();
  }

  async onClose(err?: Error): Promise<void> {
    await this.rpc.close();
  }
}
