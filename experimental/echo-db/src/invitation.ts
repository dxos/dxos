//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { Feed } from 'hypercore';
import pify from 'pify';

import { createFeedAdmitMessage, createKeyAdmitMessage, Keyring, createEnvelopeMessage } from '@dxos/credentials';
import { FeedKey, PartyKey } from '@dxos/experimental-echo-protocol';

import { PartyProcessor, Party } from './parties';

// TODO(burdon): Document these wrt credentials protocol buffer types. Move Request/Response to @dxos/credentials?

/**
 *
 */
export interface InvitationRequest {
  partyKey: PartyKey;
  feeds: FeedKey[];
}

/**
 *
 */
export interface InvitationResponse {
  peerFeedKey: FeedKey,
  keyAdmitMessage: any // TODO(burdon): HALO type?
  feedAdmitMessage: any // TODO(burdon): HALO type?
}

/**
 * Created by sender.
 */
export class Invitation {
  constructor (
    private readonly _writeStream: NodeJS.WritableStream,
    public readonly request: InvitationRequest,
    private readonly _keyring: Keyring,
    private readonly _partyKey: PartyKey,
    private readonly _identityKeypair: any
  ) {}

  async finalize (response: InvitationResponse) {
    assert(response);

    this._writeStream.write(createEnvelopeMessage(this._keyring, Buffer.from(this._partyKey), response.keyAdmitMessage, this._identityKeypair, null) as any);

    this._writeStream.write(response.feedAdmitMessage as any);
  }
}

/**
 *
 */
export class InvitationResponder {
  public readonly response: InvitationResponse;
  constructor (
    keyring: any,
    public readonly party: Party,
    feedKeyPair: any, // TODO(burdon): Crypto Type def? See types.ts.
    identityKeyPair: any
  ) {
    this.response = {
      peerFeedKey: feedKeyPair.publicKey,
      // TODO(burdon): Why convert party.key?
      keyAdmitMessage: createKeyAdmitMessage(keyring, Buffer.from(party.key), identityKeyPair),
      feedAdmitMessage: createFeedAdmitMessage(keyring, Buffer.from(party.key), feedKeyPair, identityKeyPair)
    };
  }
}
