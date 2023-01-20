//
// Copyright 2019 DXOS.org
//

import assert from 'node:assert';

import { runInContext, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { randomBytes } from '@dxos/crypto';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AuthService } from '@dxos/protocols/proto/dxos/mesh/teleport/auth';
import { ExtensionContext, RpcExtension } from '@dxos/teleport';

export type AuthProvider = (nonce: Uint8Array) => Promise<Uint8Array | undefined>;

export type AuthVerifier = (nonce: Uint8Array, credential: Uint8Array) => Promise<boolean>;

export type AuthExtensionParams = {
  provider: AuthProvider;
  verifier: AuthVerifier;
  onAuthSuccess: () => void;
  onAuthFailure: () => void;
};

export class AuthExtension extends RpcExtension<Services, Services> {
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    }
  });

  constructor(private readonly _authParams: AuthExtensionParams) {
    super({
      requested: {
        AuthService: schema.getService('dxos.mesh.teleport.auth.AuthService')
      },
      exposed: {
        AuthService: schema.getService('dxos.mesh.teleport.auth.AuthService')
      },
      timeout: 60 * 1000 // Long timeout because auth can wait for sync in certain cases.
    });
  }

  protected async getHandlers(): Promise<Services> {
    return {
      AuthService: {
        authenticate: async ({ challenge }) => {
          try {
            const credential = await this._authParams.provider(challenge);
            if (!credential) {
              throw new Error('auth rejected');
            }
            return { credential };
          } catch (err) {
            log.error('failed to generate auth credentials', err);
            throw new Error('auth rejected');
          }
        }
      }
    };
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    await super.onOpen(context);
    scheduleTask(this._ctx, async () => {
      try {
        const challenge = randomBytes(32);
        const { credential } = await this.rpc.AuthService.authenticate({ challenge });
        assert(credential?.length > 0, 'invalid credential');
        const success = await this._authParams.verifier(challenge, credential);
        assert(success, 'credential not verified');
        runInContext(this._ctx, () => this._authParams.onAuthSuccess());
      } catch (err) {
        log.warn('auth failed', err);
        this.close();
        this._authParams.onAuthFailure();
      }
    });
  }

  override async onClose(): Promise<void> {
    await this._ctx.dispose();
    await super.onClose();
  }
}

type Services = { AuthService: AuthService };
