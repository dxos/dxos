//
// Copyright 2019 DXOS.org
//

import { runInContext, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { randomBytes } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Rpc } from '@dxos/protocols';
import { create } from '@dxos/protocols/buf';
import { AuthService, AuthenticateResponseSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/auth_pb';
import { BufRpcExtension, type ExtensionContext } from '@dxos/teleport';

export type AuthProvider = (nonce: Uint8Array) => Promise<Uint8Array | undefined>;

export type AuthVerifier = (nonce: Uint8Array, credential: Uint8Array) => Promise<boolean>;

export type AuthExtensionProps = {
  provider: AuthProvider;
  verifier: AuthVerifier;
  onAuthSuccess: () => void;
  onAuthFailure: () => void;
};

type Services = { AuthService: typeof AuthService };

export class AuthExtension extends BufRpcExtension<Services, Services> {
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    },
  });

  constructor(private readonly _authProps: AuthExtensionProps) {
    super({
      requested: { AuthService },
      exposed: { AuthService },
      timeout: 60 * 1000,
    });
  }

  protected async getHandlers(): Promise<Rpc.BufServiceHandlers<Services>> {
    return {
      AuthService: {
        authenticate: async ({ challenge }) => {
          try {
            const credential = await this._authProps.provider(challenge);
            if (!credential) {
              throw new Error('auth rejected');
            }
            return create(AuthenticateResponseSchema, { credential });
          } catch (err) {
            log.error('failed to generate auth credentials', err);
            throw new Error('auth rejected');
          }
        },
      },
    };
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    await super.onOpen(context);
    scheduleTask(this._ctx, async () => {
      try {
        const challenge = randomBytes(32);
        const { credential } = await this.rpc.AuthService.authenticate({ challenge });
        invariant(credential?.length > 0, 'invalid credential');
        const success = await this._authProps.verifier(challenge, credential);
        invariant(success, 'credential not verified');
        runInContext(this._ctx, () => this._authProps.onAuthSuccess());
      } catch (err) {
        log('auth failed', err);
        this.close();
        this._authProps.onAuthFailure();
      }
    });
  }

  override async onClose(): Promise<void> {
    await this._ctx.dispose();
    await super.onClose();
  }

  override async onAbort(): Promise<void> {
    await this._ctx.dispose();
    await super.onAbort();
  }
}
