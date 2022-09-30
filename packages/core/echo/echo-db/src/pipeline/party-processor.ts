//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event } from '@dxos/async';
import { Credential, MemberInfo, PartyStateMachine } from '@dxos/halo-protocol';
import { PublicKey } from '@dxos/keys';
import { IHaloStream } from '@dxos/protocols';
import { HaloStateSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { SignedMessage } from '@dxos/protocols/proto/dxos/halo/signed';
import { jsonReplacer } from '@dxos/util';

const log = debug('dxos:echo-db:party-processor');

export interface CredentialProcessor {
  processMessage (message: IHaloStream): Promise<void>
}

export interface PartyStateProvider {
  partyKey: PublicKey
  /**
   * Whether PartyGenesis was already processed.
   */
  genesisRequired: boolean
  memberKeys: PublicKey[]
  feedKeys: PublicKey[]
  getFeedOwningMember (feedKey: PublicKey): PublicKey | undefined
  getOfflineInvitation (invitationID: Buffer): SignedMessage | undefined
  isFeedAdmitted (feedKey: PublicKey): boolean
}

/**
 * TODO(burdon): Wrapper/Bridge between HALO APIs.
 */
export class PartyProcessor implements CredentialProcessor, PartyStateProvider {
  private readonly _state = new PartyStateMachine(this._partyKey);

  readonly credentialProcessed = new Event<Credential>();

  readonly feedAdded = new Event<PublicKey>();

  public readonly keyOrInfoAdded = new Event<PublicKey>();

  /**
   * Used to generate halo snapshot.
   */
  private _snapshot: HaloStateSnapshot = { messages: [] };

  constructor (
    private readonly _partyKey: PublicKey
  ) {
    this._state.memberAdmitted.on(info => this.keyOrInfoAdded.emit(info.key));
    this._state.feedAdmitted.on(info => this.feedAdded.emit(info.key));
  }

  get partyKey () {
    return this._partyKey;
  }

  get feedKeys (): PublicKey[] {
    return Array.from(this._state.feeds.keys());
  }

  get memberKeys (): PublicKey[] {
    return Array.from(this._state.members.keys());
  }

  get credentialMessages () {
    return this._state.credentials;
  }

  get infoMessages () {
    // TODO(dmaretskyi): Not implemented.
    return [];
  }

  get genesisRequired () {
    return !this._state.genesisCredential;
  }

  get state () {
    return this._state;
  }

  isFeedAdmitted (feedKey: PublicKey) {
    return this._state.feeds.has(feedKey);
  }

  isMemberKey (publicKey: PublicKey) {
    return this._state.members.has(publicKey);
  }

  getMemberInfo (publicKey: PublicKey): MemberInfo | undefined {
    return this._state.members.get(publicKey);
  }

  /**
   * Returns public key of the member that admitted the specified feed.
   */
  getFeedOwningMember (feedKey: PublicKey): PublicKey | undefined {
    return this._state.feeds.get(feedKey)?.assertion.identityKey;
  }

  // TODO(dmaretskyi): Remove.
  /**
   * @deprecated
   */
  getOfflineInvitation (invitationID: Buffer) {
    return undefined;
  }

  async processMessage (message: IHaloStream) {
    log(`Processing: ${JSON.stringify(message, jsonReplacer)}`);
    this._snapshot.messages!.push({ message: message.data, feedKey: message.meta.feedKey });
    const ok = await this._state.process(message.data.credential, message.meta.feedKey);
    if (!ok) {
      log('Rejected credential message');
    }

    this.credentialProcessed.emit(message.data.credential);
  }

  makeSnapshot (): HaloStateSnapshot {
    return this._snapshot;
  }

  async restoreFromSnapshot (snapshot: HaloStateSnapshot) {
    assert(this._snapshot.messages!.length === 0, 'PartyProcessor is already initialized');
    assert(snapshot.messages);
    this._snapshot = snapshot;
    for (const message of snapshot.messages) {
      await this._state.process(message.message.credential, message.feedKey);
    }
  }
}
