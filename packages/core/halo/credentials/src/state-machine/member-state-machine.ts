//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { PublicKey } from '@dxos/keys';
import { Credential, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback, ComplexMap } from '@dxos/util';

import { getCredentialAssertion } from '../credentials/index.js';

export interface MemberInfo {
  key: PublicKey
  credential: Credential
  assertion: PartyMember
}

/**
 * Tracks the list of members (with roles) for the party.
 * Provides a list of admitted feeds.
 */
export class MemberStateMachine {
  /**
   * Member IDENTITY key => info
   */
  private _members = new ComplexMap<PublicKey, MemberInfo>(key => key.toHex());

  readonly onMemberAdmitted = new Callback<AsyncCallback<MemberInfo>>();

  constructor (
    private readonly _partyKey: PublicKey
  ) {}

  get members (): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members;
  }

  getRole (member: PublicKey): PartyMember.Role | undefined {
    return this._members.get(member)?.assertion.role;
  }

  /**
   * Processes the PartyMember credential.
   * Assumes the credential is already pre-verified
   * and the issuer has been authorized to issue credentials of this type.
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process (credential: Credential) {
    const assertion = getCredentialAssertion(credential);
    assert(assertion['@type'] === 'dxos.halo.credentials.PartyMember');
    assert(assertion.partyKey.equals(this._partyKey));
    assert(!this._members.has(credential.subject.id));

    const info: MemberInfo = {
      key: credential.subject.id,
      credential,
      assertion
    };
    this._members.set(credential.subject.id, info);
    await this.onMemberAdmitted.callIfSet(info);
  }
}
