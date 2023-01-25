//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Credential, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback, ComplexSet } from '@dxos/util';

import { getCredentialAssertion, verifyCredential } from '../credentials';
import { CredentialConsumer, CredentialProcessor } from '../processor/credential-processor';
import { FeedInfo, FeedStateMachine } from './feed-state-machine';
import { MemberStateMachine, MemberInfo } from './member-state-machine';

export interface SpaceState {
  readonly members: ReadonlyMap<PublicKey, MemberInfo>;
  readonly feeds: ReadonlyMap<PublicKey, FeedInfo>;
  readonly credentials: Credential[];
  readonly genesisCredential: Credential | undefined;

  registerProcessor<T extends CredentialProcessor>(handler: T): CredentialConsumer<T>;
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
  private readonly _processedCredentials = new ComplexSet<PublicKey>(PublicKey.hash);

  private _genesisCredential: Credential | undefined;
  private _credentialProcessors: CredentialConsumer<any>[] = [];

  readonly onCredentialProcessed = new Callback<AsyncCallback<Credential>>();
  readonly onMemberAdmitted = this._members.onMemberAdmitted;
  readonly onFeedAdmitted = this._feeds.onFeedAdmitted;

  // prettier-ignore
  constructor(
    private readonly _spaceKey: PublicKey
  ) { }

  // TODO(burdon): Return state object rather than extend.

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members.members;
  }

  get feeds(): ReadonlyMap<PublicKey, FeedInfo> {
    return this._feeds.feeds;
  }

  get credentials(): Credential[] {
    return this._credentials;
  }

  get genesisCredential(): Credential | undefined {
    return this._genesisCredential;
  }

  public registerProcessor<T extends CredentialProcessor>(handler: T): CredentialConsumer<T> {
    const processor = new CredentialConsumer(
      handler,
      async () => {
        for (const credential of this._credentials) {
          await processor._process(credential);
        }

        // NOTE: It is important to set this flag after immediately after processing existing credentials.
        // Otherwise, we might miss some credentials.
        // Having an `await` statement between the end of the loop and setting the flag would cause a race condition.
        processor._isReadyForLiveCredentials = true;
      },
      async () => {
        this._credentialProcessors = this._credentialProcessors.filter((p) => p !== processor);
      }
    );

    this._credentialProcessors.push(processor);
    return processor;
  }

  /**
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process(credential: Credential, fromFeed: PublicKey): Promise<boolean> {
    if (credential.id) {
      if (this._processedCredentials.has(credential.id)) {
        log.warn('duplicate credential', {
          id: credential.id,
          type: getCredentialAssertion(credential)['@type']
        });
        return false;
      }
      this._processedCredentials.add(credential.id);
    }

    const result = await verifyCredential(credential);
    if (result.kind !== 'pass') {
      log.warn(`Invalid credential: ${result.errors.join(', ')}`);
      return false;
    }

    switch (getCredentialAssertion(credential)['@type']) {
      case 'dxos.halo.credentials.SpaceGenesis': {
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
      }

      case 'dxos.halo.credentials.SpaceMember': {
        if (!this._genesisCredential) {
          log.warn('Space must have a genesis credential before adding members.');
          return false;
        }
        if (!this._canInviteNewMembers(credential.issuer)) {
          log.warn(`Space member is not authorized to invite new members: ${credential.issuer}`);
          return false;
        }

        await this._members.process(credential);
        break;
      }

      case 'dxos.halo.credentials.AdmittedFeed': {
        if (!this._genesisCredential) {
          log.warn('Space must have a genesis credential before admitting feeds.');
          return false;
        }
        if (!this._canAdmitFeeds(credential.issuer)) {
          log.warn(`Space member is not authorized to admit feeds: ${credential.issuer}`);
          return false;
        }

        // TODO(dmaretskyi): Check that the feed owner is a member of the space.
        await this._feeds.process(credential, fromFeed);
        break;
      }
    }

    // TODO(burdon): Await or void?
    void this._credentials.push(credential);

    for (const processor of this._credentialProcessors) {
      if (processor._isReadyForLiveCredentials) {
        await processor._process(credential);
      }
    }

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
