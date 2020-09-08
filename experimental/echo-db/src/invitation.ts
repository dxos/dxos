//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { createFeedAdmitMessage } from '@dxos/credentials';
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
  feedAdmitMessage: any // TODO(burdon): HALO type?
}

/**
 * Created by sender.
 */
export class Invitation {
  constructor (
    private readonly _writeStream: NodeJS.WritableStream,
    public readonly request: InvitationRequest
  ) {}

  async finalize (response: InvitationResponse) {
    assert(response);
    this._writeStream.write({ halo: response.feedAdmitMessage } as any);
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
    feedKeyPair: any // TODO(burdon): Crypto Type def? See types.ts.
  ) {
    this.response = {
      peerFeedKey: feedKeyPair.publicKey,
      // TODO(burdon): Why convert party.key?
      feedAdmitMessage: createFeedAdmitMessage(keyring, Buffer.from(party.key), feedKeyPair)
    };
  }
}
