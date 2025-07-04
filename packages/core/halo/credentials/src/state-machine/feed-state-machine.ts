//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type AdmittedFeed, type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type AsyncCallback, Callback, ComplexMap } from '@dxos/util';

import { getCredentialAssertion } from '../credentials';

export interface FeedInfo {
  key: PublicKey;
  /**
   * Parent feed from the feed tree.
   * This is the feed where the AdmittedFeed assertion is written.
   * The genesis feed will have itself as a parent.
   */
  parent: PublicKey;
  credential: Credential;
  assertion: AdmittedFeed;
}

/**
 * Tracks the feed tree for a space.
 * Provides a list of admitted feeds.
 */
export class FeedStateMachine {
  private _feeds = new ComplexMap<PublicKey, FeedInfo>(PublicKey.hash);

  readonly onFeedAdmitted = new Callback<AsyncCallback<FeedInfo>>();

  constructor(private readonly _spaceKey: PublicKey) {}

  get feeds(): ReadonlyMap<PublicKey, FeedInfo> {
    return this._feeds;
  }

  /**
   * Processes the AdmittedFeed credential.
   * Assumes the credential is already pre-verified
   * and the issuer has been authorized to issue credentials of this type.
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process(credential: Credential, fromFeed: PublicKey): Promise<void> {
    const assertion = getCredentialAssertion(credential);
    invariant(assertion['@type'] === 'dxos.halo.credentials.AdmittedFeed');
    invariant(assertion.spaceKey.equals(this._spaceKey));

    const info: FeedInfo = {
      key: credential.subject.id,
      credential,
      assertion,
      parent: fromFeed,
    };

    this._feeds.set(credential.subject.id, info);
    await this.onFeedAdmitted.callIfSet(info);
  }
}
