//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { ReadOnlyEvent } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';

import { getCredentialAssertion, verifyCredential } from '../credentials';
import { Credential, PartyMember } from '../proto';
import { FeedInfo, FeedStateMachine } from './feed-state-machine';
import { MemberStateMachine, MemberInfo } from './member-state-machine';
import { log } from '@dxos/log'

export interface PartyState {
  readonly genesisCredential: Credential | undefined
  readonly members: ReadonlyMap<PublicKey, MemberInfo>
  readonly feeds: ReadonlyMap<PublicKey, FeedInfo>
  readonly credentials: Credential[]
}

/**
 * Validates and processes credentials for a single party.
 * Keeps a list of members and feeds.
 * Keeps and in-memory index of credentials and allows to query them.
 */
export class PartyStateMachine implements PartyState {
  private readonly _members = new MemberStateMachine(this._partyKey);
  private readonly _feeds = new FeedStateMachine(this._partyKey);
  private readonly _credentials: Credential[] = [];
  private _genesisCredential: Credential | undefined;

  readonly onFeedAdmitted = this._feeds.onFeedAdmitted;
  readonly onMemberAdmitted = this._members.onMemberAdmitted;

  constructor (
    private readonly _partyKey: PublicKey
  ) {}

  get genesisCredential (): Credential | undefined {
    return this._genesisCredential;
  }

  get members (): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members.members;
  }

  get feeds (): ReadonlyMap<PublicKey, FeedInfo> {
    return this._feeds.feeds;
  }

  get credentials (): Credential[] {
    return this._credentials;
  }

  /**
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process (credential: Credential, fromFeed: PublicKey): Promise<boolean> {
    const result = await verifyCredential(credential);
    if (result.kind !== 'pass') {
      log.warn(`Invalid credential: ${result.errors.join(', ')}`);
      return false;
    }

    switch (getCredentialAssertion(credential)['@type']) {
      case 'dxos.halo.credentials.PartyGenesis':
        if (this._genesisCredential) {
          log.warn('Party already has a genesis credential.');
          return false;
        }
        if (!credential.issuer.equals(this._partyKey)) {
          log.warn('Party genesis credential must be issued by party.');
          return false;
        }
        if (!credential.subject.id.equals(this._partyKey)) {
          log.warn('Party genesis credential must be issued to party.');
          return false;
        }
        this._genesisCredential = credential;
        break;
      case 'dxos.halo.credentials.PartyMember':
        if (!this._genesisCredential) {
          log.warn('Party must have a genesis credential before adding members.');
          return false;
        }
        if (!this._canInviteNewMembers(credential.issuer)) {
          log.warn(`Party member ${credential.issuer} is not authorized to invite new members.`);
          return false;
        }
        await this._members.process(credential);
        break;
      case 'dxos.halo.credentials.AdmittedFeed':
        if (!this._genesisCredential) {
          log.warn('Party must have a genesis credential before admitting feeds.');
          return false;
        }
        if (!this._canAdmitFeeds(credential.issuer)) {
          log.warn(`Party member ${credential.issuer} is not authorized to admit feeds.`);
          return false;
        }
        // TODO(dmaretskyi): Check that the feed owner is a member of the party.
        await this._feeds.process(credential, fromFeed);
        break;
    }

    this._credentials.push(credential);

    return true;
  }

  private _canInviteNewMembers (key: PublicKey): boolean {
    return key.equals(this._partyKey) || this._members.getRole(key) === PartyMember.Role.ADMIN;
  }

  private _canAdmitFeeds (key: PublicKey): boolean {
    const role = this._members.getRole(key);
    return role === PartyMember.Role.MEMBER || role === PartyMember.Role.ADMIN;
  }
}
