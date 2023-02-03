//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { OsAppService, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

export const SHELL_CHANNEL = 'dxos:shell';

export type ShellRuntimeOptions = {
  channel: string;
  timeout: number;
};

export class ShellRuntime {
  readonly layoutUpdate = new Event<ShellLayout>();
  private readonly _params: ShellRuntimeOptions;
  private _appRpc?: ProtoRpcPeer<{ OsAppService: OsAppService }>;
  private _layout = ShellLayout.DEFAULT;

  constructor({ channel = SHELL_CHANNEL, timeout = 1000 }: Partial<ShellRuntimeOptions> = {}) {
    this._params = { channel, timeout };
  }

  get layout() {
    return this._layout;
  }

  async setDisplay(display: ShellDisplay) {
    await this._appRpc?.rpc.OsAppService.setDisplay({ display });
  }

  async setSpace(spaceKey: PublicKey) {
    await this._appRpc?.rpc.OsAppService.setSpace({ spaceKey });
  }

  async open() {
    const port = await createIFramePort({ channel: this._params.channel });
    this._appRpc = createProtoRpcPeer({
      requested: {
        OsAppService: schema.getService('dxos.iframe.OsAppService')
      },
      exposed: {
        OsShellService: schema.getService('dxos.iframe.OsShellService')
      },
      handlers: {
        OsShellService: {
          setLayout: async ({ layout }) => {
            this._layout = layout;
            this.layoutUpdate.emit(layout);
          }
        }
      },
      port,
      timeout: this._params.timeout
    });

    await this._appRpc.open();
  }

  async close() {
    await this._appRpc?.close();
    this._appRpc = undefined;
  }
}
