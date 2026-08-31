//
// Copyright 2024 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { synchronized } from '@dxos/async';
import { type Context } from '@dxos/context';
import { generateSeedPhrase, getCredentialAssertion, keyPairFromSeedPhrase } from '@dxos/credentials';
import { sign } from '@dxos/crypto';
import { type EdgeHttpClient, EdgeHttpClientService } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  EdgeAuthChallengeError,
  EdgeCallFailedError,
  type RecoverIdentityRequest as EdgeRecoverIdentityRequest,
  InvalidRecoveryTokenError,
  type RecoverIdentityResponseBody,
} from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type RecoverIdentityRequest } from '@dxos/protocols/proto/dxos/client/services';
import { type Credential, IdentityRecovery } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type IdentityService } from '@dxos/protocols/rpc';
import { Timeframe } from '@dxos/timeframe';
import { ComplexSet } from '@dxos/util';

import { type Identity } from './identity';
import { IdentityManagerService, type JoinIdentityProps } from './identity-manager';

/**
 * Effect service tag for {@link EdgeIdentityRecoveryManager}.
 */
export class EdgeIdentityRecoveryManagerService extends EffectContext.Service<
  EdgeIdentityRecoveryManagerService,
  EdgeIdentityRecoveryManager
>()('@dxos/client-services/EdgeIdentityRecoveryManager') {}

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
  }: IdentityService.CreateRecoveryCredentialRequest): Promise<{ recoveryCode: string | undefined }> {
    const identity = this._identityProvider();
    invariant(identity);

    let recoveryKey: PublicKey;
    let lookupKey: PublicKey;
    let algorithm: string;
    let recoveryCode: string | undefined;
    let kind: IdentityRecovery.Kind;
    let label: string | undefined;
    if (data) {
      recoveryKey = data.recoveryKey;
      lookupKey = data.lookupKey;
      algorithm = data.algorithm;
      kind = data.kind ?? IdentityRecovery.Kind.UNKNOWN;
      label = data.label;
    } else {
      // The seed phrase is generated here rather than by the caller, so the label is too.
      recoveryCode = await generateSeedPhrase();
      const keypair = await keyPairFromSeedPhrase(recoveryCode);
      recoveryKey = PublicKey.from(keypair.publicKey);
      lookupKey = PublicKey.from(keypair.publicKey);
      algorithm = 'ED25519';
      kind = IdentityRecovery.Kind.RECOVERY_CODE;
      label = 'Recovery code';
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
        label,
        kind,
      },
    });

    const receipt = await identity.controlPipeline.writer.write({ credential: { credential } });
    await identity.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));

    return { recoveryCode };
  }

  /**
   * Revoke a recovery credential by writing an `IdentityRecoveryRevoked` assertion to the identity's
   * control feed, mirroring how `SpaceDeleted` tombstones a space: the feed is append-only, so the
   * original credential stays and this marks it spent. The assertion replicates to the user's other
   * devices and to their agent, which is what drives the server-side refusal.
   *
   * Refuses the last un-revoked credential. Doing so would leave the holder unable to recover their
   * identity with no self-service way back — the replacement has to be added first.
   *
   * `@synchronized` so two revocations on this device cannot both observe two active credentials and
   * each cancel a different one. It cannot serialize across devices: the control feed is append-only
   * with no consensus, so two devices revoking at once can still drive the count to zero. The agents
   * service is the authority there — it re-checks the active count before flipping a row to REVOKED.
   */
  @synchronized
  public async revokeRecoveryCredential({ lookupKey }: { lookupKey: PublicKey }): Promise<void> {
    const identity = this._identityProvider();
    invariant(identity);

    const active = this.listActiveRecoveryCredentials();
    if (!active.some(({ assertion }) => assertion.lookupKey?.equals(lookupKey))) {
      throw new Error('Recovery credential is not registered, or is already revoked.');
    }
    if (active.length <= 1) {
      throw new Error('Cannot revoke the only remaining recovery credential; add another one first.');
    }

    const identityKey = identity.identityKey;
    const credential = await identity.getIdentityCredentialSigner().createCredential({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityRecoveryRevoked',
        identityKey,
        lookupKey,
        'revokedAt': new Date(),
      },
    });

    const receipt = await identity.controlPipeline.writer.write({ credential: { credential } });
    await identity.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
  }

  /**
   * Recovery credentials in the identity's HALO that no `IdentityRecoveryRevoked` assertion cancels.
   *
   * Credentials written before `lookupKey` existed cannot be matched by a revocation, so they are
   * always active — and still count towards the last-credential check, since they remain usable.
   */
  public listActiveRecoveryCredentials(): { credential: Credential; assertion: IdentityRecovery }[] {
    const identity = this._identityProvider();
    invariant(identity);

    const revoked = new ComplexSet<PublicKey>(PublicKey.hash);
    const registered: { credential: Credential; assertion: IdentityRecovery }[] = [];
    for (const credential of identity.space.spaceState.credentials) {
      const assertion = getCredentialAssertion(credential);
      switch (assertion['@type']) {
        case 'dxos.halo.credentials.IdentityRecovery':
          registered.push({ credential, assertion });
          break;
        case 'dxos.halo.credentials.IdentityRecoveryRevoked':
          revoked.add(assertion.lookupKey);
          break;
      }
    }

    return registered.filter(({ assertion }) => !(assertion.lookupKey && revoked.has(assertion.lookupKey)));
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
      haloSpaceRootUrl: response.haloSpaceRootUrl,
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

    const response = await this._edgeClient.recoverIdentity(ctx, request).catch((error) => {
      // Rethrow the registered class so the token-rejection identity survives the services RPC boundary.
      if (error instanceof EdgeCallFailedError && InvalidRecoveryTokenError.is(error.cause)) {
        throw new InvalidRecoveryTokenError({ cause: error });
      }
      throw error;
    });

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

    const recoveryKeypair = await keyPairFromSeedPhrase(recoveryCode);
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
  KeyringApiService | IdentityManagerService
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
