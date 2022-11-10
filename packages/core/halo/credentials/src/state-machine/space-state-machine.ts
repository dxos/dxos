//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Credential, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback } from '@dxos/util';

import { getCredentialAssertion, verifyCredential } from '../credentials';
import { FeedInfo, FeedStateMachine } from './feed-state-machine';
import { MemberStateMachine, MemberInfo } from './member-state-machine';

export interface SpaceState {
  readonly genesisCredential: Credential | undefined;
  readonly members: ReadonlyMap<PublicKey, MemberInfo>;
  readonly feeds: ReadonlyMap<PublicKey, FeedInfo>;
  readonly credentials: Credential[];
}

/**
 * Validates and processes credentials for a single space.
 * Keeps a list of members and feeds.
 * Keeps and in-memory index of credentials and allows to query them.
 */
export class SpaceStateMachine implements SpaceState {
  private readonly _members = new MemberStateMachine(this._spaceKey);
  private readonly _feeds = new FeedStateMachine(this._spaceKey);
  private readonly _credentials: Credential[] = [];
  private _genesisCredential: Credential | undefined;

  readonly onCredentialProcessed = new Callback<AsyncCallback<Credential>>();
  readonly onMemberAdmitted = this._members.onMemberAdmitted;
  readonly onFeedAdmitted = this._feeds.onFeedAdmitted;

  // prettier-ignore
  constructor(
    private readonly _spaceKey: PublicKey
  ) {}

  get genesisCredential(): Credential | undefined {
    return this._genesisCredential;
  }

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members.members;
  }

  get feeds(): ReadonlyMap<PublicKey, FeedInfo> {
    return this._feeds.feeds;
  }

  get credentials(): Credential[] {
    return this._credentials;
  }

  /**
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process(credential: Credential, fromFeed: PublicKey): Promise<boolean> {
    const result = await verifyCredential(credential);
    if (result.kind !== 'pass') {
      log.warn(`Invalid credential: ${result.errors.join(', ')}`);
      return false;
    }

    switch (getCredentialAssertion(credential)['@type']) {
      case 'dxos.halo.credentials.SpaceGenesis':
        if (this._genesisCredential) {
          log.warn('Space already has a genesis credential.');
          return false;
        }
        if (!credential.issuer.equals(this._spaceKey)) {
          log.warn('Space genesis credential must be issued by space.');
          return false;
        }
        if (!credential.subject.id.equals(this._spaceKey)) {
          log.warn('Space genesis credential must be issued to space.');
          return false;
        }
        this._genesisCredential = credential;
        break;
      case 'dxos.halo.credentials.SpaceMember':
        if (!this._genesisCredential) {
          log.warn('Space must have a genesis credential before adding members.');
          return false;
        }
        if (!this._canInviteNewMembers(credential.issuer)) {
          log.warn(`Space member ${credential.issuer} is not authorized to invite new members.`);
          return false;
        }
        await this._members.process(credential);
        break;
      case 'dxos.halo.credentials.AdmittedFeed':
        if (!this._genesisCredential) {
          log.warn('Space must have a genesis credential before admitting feeds.');
          return false;
        }
        if (!this._canAdmitFeeds(credential.issuer)) {
          log.warn(`Space member ${credential.issuer} is not authorized to admit feeds.`);
          return false;
        }
        // TODO(dmaretskyi): Check that the feed owner is a member of the space.
        await this._feeds.process(credential, fromFeed);
        break;
    }

    this._credentials.push(credential);
    await this.onCredentialProcessed.callIfSet(credential);

    return true;
  }

  private _canInviteNewMembers(key: PublicKey): boolean {
    return key.equals(this._spaceKey) || this._members.getRole(key) === SpaceMember.Role.ADMIN;
  }

  private _canAdmitFeeds(key: PublicKey): boolean {
    const role = this._members.getRole(key);
    return role === SpaceMember.Role.MEMBER || role === SpaceMember.Role.ADMIN;
  }
}
