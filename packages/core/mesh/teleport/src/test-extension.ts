//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { promiseTimeout, Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { TestService } from '@dxos/protocols/proto/example/testing/rpc';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { ExtensionContext, TeleportExtension } from './teleport';

export class TestExtension implements TeleportExtension {
  private _rpc!: ProtoRpcPeer<{ TestService: TestService }>;
  private _opened = new Trigger();

  async onOpen(context: ExtensionContext) {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });
    this._rpc = createProtoRpcPeer<{ TestService: TestService }, { TestService: TestService }>({
      port: context.createPort('rpc'),
      requested: {
        TestService: schema.getService('example.testing.rpc.TestService')
      },
      exposed: {
        TestService: schema.getService('example.testing.rpc.TestService')
      },
      handlers: {
        TestService: {
          voidCall: async (request) => {
            // Ok.
          },
          testCall: async (request) => {
            return {
              data: request.data
            };
          }
        }
      },
      timeout: 1000
    });

    await this._rpc.open();

    this._opened.wake();
  }

  async onClose(err?: Error) {
    log('onClose');
    await this._rpc.close();
  }

  async test() {
    await this._opened.wait({ timeout: 500 });
    const res = await promiseTimeout(this._rpc.rpc.TestService.testCall({ data: 'test' }), 500);
    assert(res.data === 'test');
  }
}
