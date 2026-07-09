//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectContext from 'effect/Context';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { type Context } from '@dxos/context';
import { generateSeedPhrase, keyPairFromSeedPhrase } from '@dxos/credentials';
import { sign } from '@dxos/crypto';
import { EdgeHttpClientService, type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { KeyringApiService, type KeyringApi } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  EdgeAuthChallengeError,
  type RecoverIdentityRequest as EdgeRecoverIdentityRequest,
  type RecoverIdentityResponseBody,
} from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import {
  type CreateRecoveryCredentialRequest,
  type RecoverIdentityRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { Timeframe } from '@dxos/timeframe';

import { type Identity } from './identity';
import { IdentityManagerService, type JoinIdentityProps } from './identity-manager';

/**
 * Effect service tag for {@link EdgeIdentityRecoveryManager}.
 */
export class EdgeIdentityRecoveryManagerService extends EffectContext.Tag(
  '@dxos/client-services/EdgeIdentityRecoveryManager',
)<EdgeIdentityRecoveryManagerService, EdgeIdentityRecoveryManager>() {}

export type AcceptRecoveredIdentity = (params: JoinIdentityProps) => Promise<Identity>;

export class EdgeIdentityRecoveryManager {
  private _acceptRecoveredIdentity?: AcceptRecoveredIdentity;

  constructor(
    private readonly _keyring: KeyringApi,
    private readonly _edgeClient: EdgeHttpClient | undefined,
    private readonly _identityProvider: () => Identity | undefined,
  ) {}

  /**
   * Wires identity acceptance after the composing stack is fully constructed.
   */
  setAcceptRecoveredIdentity(acceptRecoveredIdentity: AcceptRecoveredIdentity): void {
    this._acceptRecoveredIdentity = acceptRecoveredIdentity;
  }

  public async createRecoveryCredential({
    data,
  }: CreateRecoveryCredentialRequest): Promise<{ recoveryCode: string | undefined }> {
    const identity = this._identityProvider();
    invariant(identity);

    let recoveryKey: PublicKey;
    let lookupKey: PublicKey;
    let algorithm: string;
    let recoveryCode: string | undefined;
    if (data) {
      recoveryKey = data.recoveryKey;
      lookupKey = data.lookupKey;
      algorithm = data.algorithm;
    } else {
      recoveryCode = generateSeedPhrase();
      const keypair = keyPairFromSeedPhrase(recoveryCode);
      recoveryKey = PublicKey.from(keypair.publicKey);
      lookupKey = PublicKey.from(keypair.publicKey);
      algorithm = 'ED25519';
    }

    const identityKey = identity.identityKey;
    const credential = await identity.getIdentityCredentialSigner().createCredential({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityRecovery',
        recoveryKey,
        identityKey,
        algorithm,
        lookupKey,
      },
    });

    const receipt = await identity.controlPipeline.writer.write({ credential: { credential } });
    await identity.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));

    return { recoveryCode };
  }

  public async requestRecoveryChallenge(ctx: Context) {
    invariant(this._edgeClient, 'Not connected to EDGE.');

    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const request: EdgeRecoverIdentityRequest = {
      deviceKey: deviceKey.toHex(),
      controlFeedKey: controlFeedKey.toHex(),
    };

    try {
      await this._edgeClient.recoverIdentity(ctx, request);
      throw new Error('No challenge received.');
    } catch (error: any) {
      if (!(error instanceof EdgeAuthChallengeError)) {
        throw error;
      }
      return {
        deviceKey,
        controlFeedKey,
        challenge: error.challenge,
      };
    }
  }

  public async recoverIdentityWithExternalSignature(
    ctx: Context,
    {
      lookupKey,
      deviceKey,
      controlFeedKey,
      signature,
      clientDataJson,
      authenticatorData,
    }: RecoverIdentityRequest.ExternalSignature,
  ): Promise<void> {
    invariant(this._edgeClient, 'Not connected to EDGE.');

    const request: EdgeRecoverIdentityRequest = {
      lookupKey: lookupKey.toHex(),
      deviceKey: deviceKey.toHex(),
      controlFeedKey: controlFeedKey.toHex(),
      signature:
        clientDataJson && authenticatorData
          ? {
              signature: Buffer.from(signature).toString('base64'),
              clientDataJson: Buffer.from(clientDataJson).toString('base64'),
              authenticatorData: Buffer.from(authenticatorData).toString('base64'),
            }
          : Buffer.from(signature).toString('base64'),
    };

    const response = await this._edgeClient.recoverIdentity(ctx, request);

    await this.#acceptRecoveredIdentity({
      authorizedDeviceCredential: decodeCredential(response.deviceAuthCredential),
      haloGenesisFeedKey: PublicKey.fromHex(response.genesisFeedKey),
      haloSpaceKey: PublicKey.fromHex(response.haloSpaceKey),
      identityKey: PublicKey.fromHex(response.identityKey),
      deviceKey,
      controlFeedKey,
      dataFeedKey: await this._keyring.createKey(),
    });
  }

  /**
   * Recover an identity using an opaque one-time token. Accepts either an email magic-link
   * `token` (validated by hub-service) or an OAuth `recoveryProof` (redeemed by kms-service).
   * The two fields are routed to different backends by db-service and must not be conflated.
   */
  public async recoverIdentityWithToken(
    ctx: Context,
    fields: { token: string } | { recoveryProof: string },
  ): Promise<void> {
    invariant(this._edgeClient, 'Not connected to EDGE.');

    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const request: EdgeRecoverIdentityRequest = {
      deviceKey: deviceKey.toHex(),
      controlFeedKey: controlFeedKey.toHex(),
      ...fields,
    };

    const response = await this._edgeClient.recoverIdentity(ctx, request);

    await this.#acceptRecoveredIdentity({
      authorizedDeviceCredential: decodeCredential(response.deviceAuthCredential),
      haloGenesisFeedKey: PublicKey.fromHex(response.genesisFeedKey),
      haloSpaceKey: PublicKey.fromHex(response.haloSpaceKey),
      identityKey: PublicKey.fromHex(response.identityKey),
      deviceKey,
      controlFeedKey,
      dataFeedKey: await this._keyring.createKey(),
    });
  }

  public async recoverIdentity(ctx: Context, { recoveryCode }: { recoveryCode: string }): Promise<void> {
    invariant(this._edgeClient, 'Not connected to EDGE.');

    const recoveryKeypair = keyPairFromSeedPhrase(recoveryCode);
    const recoveryKey = PublicKey.from(recoveryKeypair.publicKey);
    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const request: EdgeRecoverIdentityRequest = {
      lookupKey: recoveryKey.toHex(),
      deviceKey: deviceKey.toHex(),
      controlFeedKey: controlFeedKey.toHex(),
    };

    let response: RecoverIdentityResponseBody;
    try {
      response = await this._edgeClient.recoverIdentity(ctx, request);
    } catch (error: any) {
      if (!(error instanceof EdgeAuthChallengeError)) {
        throw error;
      }
      const signature = sign(Buffer.from(error.challenge, 'base64'), recoveryKeypair.secretKey);
      response = await this._edgeClient.recoverIdentity(ctx, {
        ...request,
        signature: Buffer.from(signature).toString('base64'),
      });
    }

    log.info('recovering identity', response);

    await this.#acceptRecoveredIdentity({
      authorizedDeviceCredential: decodeCredential(response.deviceAuthCredential),
      haloGenesisFeedKey: PublicKey.fromHex(response.genesisFeedKey),
      haloSpaceKey: PublicKey.fromHex(response.haloSpaceKey),
      identityKey: PublicKey.fromHex(response.identityKey),
      deviceKey,
      controlFeedKey,
      dataFeedKey: await this._keyring.createKey(),
    });
  }

  #acceptRecoveredIdentity(params: JoinIdentityProps): Promise<Identity> {
    invariant(this._acceptRecoveredIdentity, 'acceptRecoveredIdentity not set');
    return this._acceptRecoveredIdentity(params);
  }
}

const decodeCredential = (credentialBase64: string) => {
  const credentialBytes = Buffer.from(credentialBase64, 'base64');
  const codec = schema.getCodecForType('dxos.halo.credentials.Credential');
  return codec.decode(credentialBytes);
};

/**
 * Effect Layer constructing a dormant {@link EdgeIdentityRecoveryManager}.
 */
export const EdgeIdentityRecoveryManagerLayer = (): Layer.Layer<
  EdgeIdentityRecoveryManagerService,
  never,
  KeyringApiService | EdgeHttpClientService | IdentityManagerService
> =>
  Layer.effect(
    EdgeIdentityRecoveryManagerService,
    Effect.gen(function* () {
      const keyring = yield* KeyringApiService;
      const edgeClient = yield* Effect.serviceOption(EdgeHttpClientService);
      const identityManager = yield* IdentityManagerService;
      return new EdgeIdentityRecoveryManager(
        keyring,
        Option.getOrUndefined(edgeClient),
        () => identityManager.identity,
      );
    }),
  );
