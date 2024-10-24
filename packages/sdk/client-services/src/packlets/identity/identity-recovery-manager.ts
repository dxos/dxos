//
// Copyright 2024 DXOS.org
//

import { generateSeedPhrase, keyPairFromSeedPhrase } from '@dxos/credentials';
import { sign } from '@dxos/crypto';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeAuthChallengeError, type RecoverIdentityRequest, type RecoverIdentityResponseBody } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { Timeframe } from '@dxos/timeframe';

import { type Identity } from './identity';
import { type JoinIdentityParams } from './identity-manager';

export class EdgeIdentityRecoveryManager {
  constructor(
    private readonly _keyring: Keyring,
    private readonly _edgeClient: EdgeHttpClient | undefined,
    private readonly _identityProvider: () => Identity | undefined,
    private readonly _acceptRecoveredIdentity: (params: JoinIdentityParams) => Promise<Identity>,
  ) {}

  public async createRecoveryPhrase() {
    const identity = this._identityProvider();
    invariant(identity);

    const seedphrase = generateSeedPhrase();
    const keypair = keyPairFromSeedPhrase(seedphrase);
    const recoveryKey = PublicKey.from(keypair.publicKey);
    const identityKey = identity.identityKey;
    const credential = await identity.getIdentityCredentialSigner().createCredential({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityRecovery',
        recoveryKey,
        identityKey,
      },
    });

    const receipt = await identity.controlPipeline.writer.write({ credential: { credential } });
    await identity.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));

    return { seedphrase };
  }

  public async recoverIdentity(args: { seedphrase: string }) {
    invariant(this._edgeClient, 'Not connected to EDGE.');

    const recoveryKeypair = keyPairFromSeedPhrase(args.seedphrase);
    const recoveryKey = PublicKey.from(recoveryKeypair.publicKey);
    const deviceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const request: RecoverIdentityRequest = {
      recoveryKey: recoveryKey.toHex(),
      deviceKey: deviceKey.toHex(),
      controlFeedKey: controlFeedKey.toHex(),
    };

    let response: RecoverIdentityResponseBody;
    try {
      response = await this._edgeClient.recoverIdentity(request);
    } catch (error: any) {
      if (!(error instanceof EdgeAuthChallengeError)) {
        throw error;
      }
      const signature = sign(Buffer.from(error.challenge, 'base64'), recoveryKeypair.secretKey);
      response = await this._edgeClient.recoverIdentity({
        ...request,
        signature: Buffer.from(signature).toString('base64'),
      });
    }

    log.info('recovering identity', response);

    await this._acceptRecoveredIdentity({
      authorizedDeviceCredential: decodeCredential(response.deviceAuthCredential),
      haloGenesisFeedKey: PublicKey.fromHex(response.genesisFeedKey),
      haloSpaceKey: PublicKey.fromHex(response.haloSpaceKey),
      identityKey: PublicKey.fromHex(response.identityKey),
      deviceKey,
      controlFeedKey,
      dataFeedKey: await this._keyring.createKey(),
    });
  }
}

const decodeCredential = (credentialBase64: string) => {
  const credentialBytes = Buffer.from(credentialBase64, 'base64');
  const codec = schema.getCodecForType('dxos.halo.credentials.Credential');
  return codec.decode(credentialBytes);
};
