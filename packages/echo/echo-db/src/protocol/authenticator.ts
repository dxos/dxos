//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { FeedKey, FeedWriter, PartyKey, schema } from '@dxos/echo-protocol';

import { PartyProcessor, PartyStateProvider } from '../pipeline';
import { CredentialsSigner } from './credentials-signer';
import { AdmittedFeed, Auth, createCredential, Credential, isValidAuthorizedDeviceCredential, verifyCredential } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/credentials';
import assert from 'assert';
import { PublicKey } from '@dxos/protocols';

const log = debug('dxos:echo-db:authenticator');

export const createAuthenticator = (
  partyProcessor: PartyProcessor,
  credentialsSigner: CredentialsSigner,
  credentialsWriter: FeedWriter<Credential>
): Authenticator => new PartyAuthenticator(partyProcessor, async auth => {
  if(auth.feedAdmit?.subject?.assertion['@type'] !== 'dxos.halo.credentials.AdmittedFeed') {
    log('Invalid credential type: %s', auth.feedAdmit?.subject?.assertion['@type']);
    return
  }

  if(partyProcessor.isFeedAdmitted(auth.feedAdmit.subject.id)) {
    log('Feed already admitted: %s', auth.feedAdmit.subject.id);
    return
  }
  
  // TODO(dmaretskyi): Verify credential identity and device keys.

  log(`Admitting feed of authenticated member: ${auth.feedAdmit.issuer}`);
  await credentialsWriter.write(auth.feedAdmit);
});

export interface CredentialsProvider {
  /**
   * The credentials (e.g., a serialized AuthMessage) as a bytes.
   */
  get (): Promise<Buffer>
}

export const createCredentialsProvider = (credentialsSigner: CredentialsSigner, partyKey: PartyKey, feedKey: FeedKey): CredentialsProvider => ({
  get: async () => {
    const chain = credentialsSigner.getDeviceSigningKeys();
    assert(!(chain instanceof PublicKey) && !!chain.credential, 'Invalid device signing keys');

    const feedAdmit = await createCredential({
      issuer: credentialsSigner.getIdentityKey().publicKey,
      subject: feedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: partyKey,
        identityKey: credentialsSigner.getIdentityKey().publicKey,
        deviceKey: credentialsSigner.getDeviceKey().publicKey,
        designation: AdmittedFeed.Designation.CONTROL,
      },
      keyring: credentialsSigner.signer as Keyring, // TODO(dmaretskyi): Fix signer interface.
      chain,
      signingKey: credentialsSigner.getDeviceKey().publicKey,
    })

    const authMessage: Auth = {
      crednetials: {
        credentials: [chain.credential],
      },
      feedAdmit: feedAdmit,
    };
    return Buffer.from(schema.getCodecForType('dxos.halo.credentials.Auth').encode(authMessage));
  }
});


/**
 * Interface for Authenticators.
 * Used by AuthPlugin for authenticating nodes during handshake.
 */
export interface Authenticator {
  /**
   * Return true if the credentials checkout, else false.
   */
  authenticate(credentials: Auth): Promise<boolean>
}

/**
 * A Party-based Authenticator, which checks that the supplied credentials belong to a Party member.
 */
export class PartyAuthenticator implements Authenticator {

  /**
   * Takes the target Party for checking admitted keys and verifying signatures.
   */
  constructor (
    // TODO(dmaretskyi): Reduce only to member list?.
    private readonly _party: PartyStateProvider,
    private readonly _onAuthenticated?: (auth: Auth) => Promise<void>
  ) {}

  /**
   * Authenticate the credentials presented during handshake. The signature on the credentials must be valid and belong
   * to a key already admitted to the Party.
   * @param auth
   * @returns {boolean} true if authenticated, else false
   */
  // TODO(dboreham): Verify that credentials is a message of type `dxos.credentials.SignedMessage`
  //  signing a message of type `dxos.credentials.auth.Auth`.
  async authenticate (auth: Auth): Promise<boolean> {
    // Verify that presentation is ok.
    if(!auth.crednetials.credentials || auth.crednetials.credentials.length !== 1) {
      log('Bad presentation');
      return false;
    }

    // Verify that credential is valid.
    const credential = auth.crednetials.credentials[0];
    const result = await verifyCredential(credential)
    if(result.kind !== 'pass') {
      log(`Invalid credential: ${result.errors}`);
      return false;
    }

    const identityKey = credential.issuer;
    const deviceKey = credential.subject.id;

    // Verify credential type.
    if(!isValidAuthorizedDeviceCredential(credential, identityKey, deviceKey)) {
      log('Invalid credential type');
      return false;
    }

    // TODO(dmaretskyi): Validate presentation nonce.

    // TODO(dmaretskyi): Do we need to include and verify the party key during auth?
    



    /*
     * TODO(telackey): This is not how it should be done. We would rather use the remote
     * nonce for anti-replay, but we will need to add hooks for retrieving it and signing it
     * between connect() and handshake() to do that. In the meantime, not allowing infinite replay
    //  * is at least something.
    //  */
    // const then = moment(created, 'YYYY-MM-DDTHH:mm:ssZ', true);
    // if (!then.isValid()) {
    //   log(`Bad credentials: invalid created ${created} time.`);
    //   return false;
    // }

    // const diff = moment().diff(then, 'seconds');
    // if (Math.abs(diff) > MAX_AGE) {
    //   log(`Bad credentials: time skew too large: ${diff}ms`);
    //   return false;
    // }

    // // Check that the Party matches.
    // if (!this._party.publicKey.equals(partyKey)) {
    //   log(`Wrong party: ${auth}`);
    //   return false;
    // }

    // const verified = this._party.verifySignatures(auth);

    // if (
    //   verified
    //   // feedAdmit &&
    //   // PublicKey.isPublicKey(feedKey) &&
    //   // !this._party.memberFeeds.find(partyFeed => partyFeed.equals(feedKey))
    // ) {

    log(`Member authenticated: deviceKey=${deviceKey}, identityKey=${identityKey}`);
    await this._onAuthenticated?.(auth);

    return true;
  }
}
