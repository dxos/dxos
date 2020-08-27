//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PartyCredential, getPartyCredentialMessageType } from '@dxos/credentials';
import { IHaloStream, PublicKey, FeedKey, PartyKey } from '@dxos/experimental-echo-protocol';
import { jsonReplacer } from '@dxos/experimental-util';

import { PartyProcessor } from './party-processor';

class KeySet extends Set<PublicKey> {
  private _equalsMatch (value: PublicKey) {
    for (const v of this.values()) {
      if (v.equals(value)) {
        return v;
      }
    }
    return undefined;
  }

  public add (value: PublicKey) {
    if (!this.has(value)) {
      super.add(value);
    }
    return this;
  }

  public has (value: PublicKey) {
    return !!this._equalsMatch(value);
  }

  public delete (value: PublicKey) {
    const existing = this._equalsMatch(value);
    return existing ? super.delete(existing) : false;
  }
}

/**
 * Party processor for testing.
 */
export class TestPartyProcessor extends PartyProcessor {
  private _feedKeys = new KeySet();
  private _memberKeys = new KeySet();

  // TODO(telackey): Remove feedKey.
  constructor (partyKey: PartyKey, feedKey: FeedKey) {
    super(partyKey);
    this._feedKeys.add(feedKey);
  }

  async _processMessage (message: IHaloStream): Promise<void> {
    const { data } = message;

    switch (getPartyCredentialMessageType(data)) {
      case PartyCredential.Type.PARTY_GENESIS: {
        const { partyKey, feedKey, admitKey } = data.payload.signed.payload.contents;
        assert(partyKey);
        assert(feedKey);
        assert(admitKey);
        assert(Buffer.compare(partyKey, this._partyKey) === 0);
        this._feedKeys.add(feedKey);
        this._memberKeys.add(admitKey);
        return;
      }
      default:
        throw new Error(`Invalid message: ${JSON.stringify(message, jsonReplacer)}`);
    }
  }

  public get feedKeys () {
    return Array.from(this._feedKeys.values());
  }

  public get memberKeys () {
    return Array.from(this._memberKeys.values());
  }
}
