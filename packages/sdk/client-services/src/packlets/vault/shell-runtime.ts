//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { AppContextRequest, LayoutRequest, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { AppServiceBundle, appServiceBundle, shellServiceBundle } from './services';

export interface ShellRuntime {
  layoutUpdate: Event<LayoutRequest>;
  layout: ShellLayout;
  invitationCode?: string;
  spaceKey?: PublicKey;
  setLayout: (layout: ShellLayout, options?: Omit<LayoutRequest, 'layout'>) => void;
  setAppContext: (context: AppContextRequest) => Promise<void>;
}

/**
 * Endpoint that handles shell services.
 */
export class ShellRuntimeImpl implements ShellRuntime {
  readonly layoutUpdate = new Event<LayoutRequest>();
  private _appRpc?: ProtoRpcPeer<AppServiceBundle>;
  private _layout = ShellLayout.DEFAULT;
  private _invitationCode?: string;
  private _spaceKey?: PublicKey;

  constructor(private readonly _port: RpcPort) {}

  get layout() {
    return this._layout;
  }

  get invitationCode() {
    return this._invitationCode;
  }

  get spaceKey() {
    return this._spaceKey;
  }

  setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    this._layout = layout;
    this._invitationCode = options.invitationCode;
    this._spaceKey = options.spaceKey;
    this.layoutUpdate.emit({ layout, ...options });
  }

  async setAppContext(context: AppContextRequest) {
    assert(this._appRpc, 'runtime not open');

    if (context.spaceKey) {
      this._spaceKey = context.spaceKey;
    }

    if (context.invitationCode) {
      this._invitationCode = context.invitationCode;
    }

    await this._appRpc.rpc.AppService.setContext({
      ...context,
      spaceKey: this._spaceKey,
      invitationCode: this._invitationCode
    });
  }

  async open() {
    this._appRpc = createProtoRpcPeer({
      requested: appServiceBundle,
      exposed: shellServiceBundle,
      handlers: {
        ShellService: {
          setLayout: async (request) => {
            this._layout = request.layout;
            this._invitationCode = request.invitationCode;
            this._spaceKey = request.spaceKey;
            this.layoutUpdate.emit(request);
          }
        }
      },
      port: this._port
    });

    await this._appRpc.open();
  }

  async close() {
    await this._appRpc?.close();
    this._appRpc = undefined;
  }
}

export class MemoryShellRuntime implements ShellRuntime {
  readonly layoutUpdate = new Event<LayoutRequest>();
  readonly contextUpdate = new Event<AppContextRequest>();
  private _layout: ShellLayout;
  private _invitationCode?: string;
  private _spaceKey?: PublicKey;

  constructor({ layout, invitationCode, spaceKey }: Partial<LayoutRequest> & Partial<AppContextRequest> = {}) {
    this._layout = layout ?? ShellLayout.DEFAULT;
    this._invitationCode = invitationCode;
    this._spaceKey = spaceKey;
  }

  get layout() {
    return this._layout;
  }

  get invitationCode() {
    return this._invitationCode;
  }

  get spaceKey() {
    return this._spaceKey;
  }

  setLayout(layout: ShellLayout, options: Omit<LayoutRequest, 'layout'> = {}) {
    this._layout = layout;
    this._invitationCode = options.invitationCode;
    this._spaceKey = options.spaceKey;
    this.layoutUpdate.emit({ layout, ...options });
  }

  async setAppContext(context: AppContextRequest) {
    this.contextUpdate.emit(context);
  }
}
