//
// Copyright 2020 DXOS.org
//

import { FeedKey, PartyKey } from '@dxos/experimental-echo-protocol';
import { PartyProcessor, Party } from './parties';

export interface Invitation {
  partyKey: PartyKey
  feeds: FeedKey[]
}

export interface InvitationResponse {
  newFeedKey: FeedKey
}

export class Inviter {
  constructor (
    public readonly invitation: Invitation,
    private readonly _partyProcessor: PartyProcessor
  ) {}

  finalize (response: InvitationResponse) {
    this._partyProcessor.admitFeed(response.newFeedKey);
  }
}

export class InvitationResponder {
  constructor (
    public readonly party: Party,
    public readonly response: InvitationResponse
  ) {}
}
