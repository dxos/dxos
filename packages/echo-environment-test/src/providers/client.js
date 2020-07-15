//
// Copyright 2020 DxOS.
//

import { createClient } from '@dxos/client';
import { Keyring, KeyType } from '@dxos/credentials';

// import { createId, createKeyPair, keyToString, randomBytes, sign, verify, SIGNATURE_LENGTH } from '@dxos/crypto';

import { Provider, networkTypes } from './provider';

export class ClientProvider extends Provider {
  constructor (options = {}) {
    const { initialPeers = 1, ...providerOptions } = options;

    super({ ...providerOptions, network: { type: networkTypes.NO_LINKS, parameters: [initialPeers] } });
  }

  async beforeNetworkCreated () {
    const client = await this._createClient('owner');
    this._party = await client.partyManager.createParty();
    this._topic = this._party.publicKey;
    this._secret = '0000';
    this._clientOwner = client;
  }

  async createPeer (_, peerId) {
    let client = null;

    if (this._firstPeer) {
      this._firstPeer = false;
      client = this._clientOwner;
    } else {
      client = await this._createClient(peerId);
    }

    client.networkManager.on('connection', (key, swarm, conn) => {
      this.emit('connection', conn);
    });

    this._clientIds.set(peerId.toString('hex'), client.partyManager.identityManager.deviceManager.publicKey);

    return {
      client,
      createStream () {}
    };
  }

  async afterNetworkCreated () {}

  async invitePeer ({ fromPeer, toPeer }) {
    const invitation = await fromPeer.client.partyManager.inviteToParty(this._party.publicKey, this._greeterSecretProvider, this._greeterSecretValidator);
    await toPeer.client.partyManager.joinParty(invitation, this._inviteeSecretProvider);
  }

  async _createClient (peerId) {
    const keyring = new Keyring();
    await keyring.createKeyRecord({ type: KeyType.IDENTITY });

    const client = await createClient(this.createStorage(peerId), keyring, { swarm: { signal: false, ice: false } });
    await client.partyManager.identityManager.initializeForNewIdentity();
    return client;
  }

  _greeterSecretProvider () {
    return Buffer.from(this._secret);
  }

  _greeterSecretValidator (invitation, secret) {
    return secret && secret.equals(invitation.secret);
  }

  _inviteeSecretProvider () {
    return Buffer.from(this._secret);
  }
}
