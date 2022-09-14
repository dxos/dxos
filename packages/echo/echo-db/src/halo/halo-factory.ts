//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import {
  keyPairFromSeedPhrase,
  Keyring,
  KeyType,
  Filter,
  SecretProvider
} from '@dxos/credentials';
import { todo } from '@dxos/debug';
import {
  AdmittedFeed,
  createCredential,
  createPartyGenesisCredential,
  PartyMember
} from '@dxos/halo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';

import { createHaloPartyAdmissionMessage, GreetingInitiator, HaloRecoveryInitiator, InvitationDescriptor, InvitationDescriptorType, OfflineInvitationClaimer } from '../invitations';
import { PARTY_ITEM_TYPE } from '../parties';
import { PartyFeedProvider, PipelineOptions } from '../pipeline';
import { CredentialsSigner } from '../protocol/credentials-signer';
import { SnapshotStore } from '../snapshots';
import {
  HaloParty,
  HALO_PARTY_CONTACT_LIST_TYPE, HALO_PARTY_DEVICE_PREFERENCES_TYPE, HALO_PARTY_PREFERENCES_TYPE
} from './halo-party';

/**
 * Options allowed when creating the HALO.
 */
export interface HaloCreationOptions {
  identityDisplayName?: string
  deviceDisplayName?: string
}

const log = debug('dxos:echo-db:halo-factory');

/**
 * Create and manage HALO parties.
 */
export class HaloFactory {
  constructor (
    private readonly _networkManager: NetworkManager,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _feedProviderFactory: (partyKey: PublicKey) => PartyFeedProvider,
    private readonly _keyring: Keyring,
    private readonly _options: PipelineOptions = {}
  ) {}

  async constructParty (partyKey: PublicKey): Promise<HaloParty> {
    const credentialsSigner = CredentialsSigner.createDirectDeviceSigner(this._keyring);
    const feedProvider = this._feedProviderFactory(credentialsSigner.getIdentityKey().publicKey);
    const halo = new HaloParty(
      partyKey,
      this._modelFactory,
      this._snapshotStore,
      feedProvider,
      credentialsSigner,
      this._networkManager,
      undefined,
      this._options
    );

    return halo;
  }

  async createHalo (options: HaloCreationOptions = {}): Promise<HaloParty> {

    const partyKey = await this._keyring.createKeyRecord({ type: KeyType.PARTY });

    // Don't use `identityManager.identityKey`, because that doesn't check for the secretKey.
    const identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    assert(identityKey, 'Identity key required.');

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ??
      await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    // 1. Create a feed for the HALO.
    const halo = await this.constructParty(partyKey.publicKey);
    const feedKey = await halo.getWriteFeedKey();
    const feedKeyPair = this._keyring.getKey(feedKey);
    assert(feedKeyPair);
    halo._setGenesisFeedKey(feedKey);

    // Connect the pipeline.
    await halo.open();

    // TODO(dmaretskyi): Extract party (space) creation.
    // Self-signed party genesis. Establishes root of authority.
    await halo.credentialsWriter.write(await createPartyGenesisCredential(this._keyring, partyKey.publicKey));

    // Admit the identity to the party.
    await halo.credentialsWriter.write(await createCredential({
      issuer: partyKey.publicKey,
      subject: identityKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: partyKey.publicKey,
        role: PartyMember.Role.ADMIN
      },
      keyring: this._keyring
    }));

    // Assign the HALO party to the identity.
    await halo.credentialsWriter.write(await createCredential({
      issuer: identityKey.publicKey,
      subject: identityKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.HaloSpace',
        identityKey: identityKey.publicKey,
        haloKey: partyKey.publicKey
      },
      keyring: this._keyring
    }));

    // Admit device to the identity.
    await halo.credentialsWriter.write(await createCredential({
      issuer: identityKey.publicKey,
      subject: deviceKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        identityKey: identityKey.publicKey,
        deviceKey: deviceKey.publicKey
      },
      keyring: this._keyring
    }));

    // Admit feed to the party.
    await halo.credentialsWriter.write(await createCredential({
      issuer: identityKey.publicKey,
      subject: feedKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: partyKey.publicKey,
        identityKey: identityKey.publicKey,
        deviceKey: deviceKey.publicKey,
        designation: AdmittedFeed.Designation.CONTROL
      },
      keyring: this._keyring
    }));

    // TODO(dmaretskyi): Identity/device profile & metadata.

    // Create special properties item.
    await halo.database.createItem({ model: ObjectModel, type: PARTY_ITEM_TYPE });
    await halo.database.createItem({ model: ObjectModel, type: HALO_PARTY_PREFERENCES_TYPE });
    await halo.database.createItem({ model: ObjectModel, type: HALO_PARTY_CONTACT_LIST_TYPE });
    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: deviceKey.publicKey.asBuffer() }
    });

    // Remove party genesis key.
    await this._keyring.deleteSecretKey(partyKey);

    // Do no retain the Identity secret key after creation of the HALO.
    await this._keyring.deleteSecretKey(identityKey);

    return halo;
  }

  async recoverHalo (seedPhrase: string) {
    const recoveredKeyPair = keyPairFromSeedPhrase(seedPhrase);
    await this._keyring.addKeyRecord({
      publicKey: PublicKey.from(recoveredKeyPair.publicKey),
      secretKey: recoveredKeyPair.secretKey,
      type: KeyType.IDENTITY
    });
    await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    const recoverer = new HaloRecoveryInitiator(this._networkManager, CredentialsSigner.createDirectDeviceSigner(this._keyring));
    await recoverer.connect();

    const invitationDescriptor = await recoverer.claim();

    return this._joinHalo(invitationDescriptor, recoverer.createSecretProvider());
  }

  async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(!this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY })), 'Identity key must not exist.');

    return this._joinHalo(invitationDescriptor, secretProvider);
  }

  private async _joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    log(`Admitting device with invitation: ${PublicKey.stringify(invitationDescriptor.invitation)}`);
    assert(invitationDescriptor.identityKey);

    let identityKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }));
    if (!identityKey) {
      identityKey = await this._keyring.addPublicKey({
        type: KeyType.IDENTITY,
        publicKey: invitationDescriptor.identityKey,
        own: true,
        trusted: true
      });
    } else {
      assert(identityKey.publicKey.equals(invitationDescriptor.identityKey),
        'Identity key must match invitation');
    }
    assert(identityKey);

    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ??
      await this._keyring.createKeyRecord({ type: KeyType.DEVICE });

    const originalInvitation = invitationDescriptor;

    const credentialsSigner = CredentialsSigner.createDirectDeviceSigner(this._keyring);
    // Claim the offline invitation and convert it into an interactive invitation.
    if (invitationDescriptor.type === InvitationDescriptorType.OFFLINE) {
      const invitationClaimer = new OfflineInvitationClaimer(this._networkManager, invitationDescriptor);
      await invitationClaimer.connect();
      invitationDescriptor = await invitationClaimer.claim();
      log(`Party invitation triggered interactive Greeting at: ${JSON.stringify({ original: originalInvitation.invitation, interactive: invitationDescriptor.invitation })}`);
      await invitationClaimer.destroy();
    }

    const initiator = new GreetingInitiator(
      this._networkManager,
      invitationDescriptor,
      async (partyKey, nonce) => {
        assert(partyKey.equals(identityKey!.publicKey));
        return [createHaloPartyAdmissionMessage(credentialsSigner, nonce)];
      }
    );

    await initiator.connect();
    const { genesisFeedKey } = await initiator.redeemInvitation(secretProvider);

    const halo = await this.constructParty(todo());
    halo._setGenesisFeedKey(genesisFeedKey);
    await halo.open();

    await initiator.destroy();

    await halo.database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DEVICE_PREFERENCES_TYPE,
      props: { publicKey: deviceKey.publicKey.asBuffer() }
    });

    return halo;
  }
}
