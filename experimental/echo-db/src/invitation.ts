//
// Copyright 2020 DXOS.org
//

import { FeedKey, PartyKey } from '@dxos/experimental-echo-protocol';
import { PartyProcessor, Party } from './parties';
import { createFeedAdmitMessage } from '@dxos/credentials';

export interface Invitation {
  partyKey: PartyKey
  feeds: FeedKey[]
}

export interface InvitationResponse {
  peerFeedKey: FeedKey,
  feedAdmitMessage: any,
}

export class Inviter {
  constructor (
    private readonly _partyProcessor: PartyProcessor,
    private readonly _writeStream: NodeJS.WritableStream,
    public readonly invitation: Invitation
  ) {}

  finalize (response: InvitationResponse) {
    this._partyProcessor.admitFeed(response.peerFeedKey);

    this._writeStream.write(response.feedAdmitMessage);
  }
}

export class InvitationResponder {
  public readonly response: InvitationResponse;

  constructor (
    public readonly party: Party,
    keyring: any,
    feedKeypair: any
  ) {
    this.response = {
      peerFeedKey: feedKeypair.key,
      feedAdmitMessage: createFeedAdmitMessage(keyring, Buffer.from(party.key), feedKeypair)
    };
  }
}
