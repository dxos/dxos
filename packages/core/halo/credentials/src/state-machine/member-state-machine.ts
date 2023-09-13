//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Credential, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback, ComplexMap } from '@dxos/util';

import { getCredentialAssertion } from '../credentials';

export interface MemberInfo {
  key: PublicKey;
  credential: Credential;
  assertion: SpaceMember;
  removed: boolean;
}

/**
 * Tracks the list of members (with roles) for the space.
 * Provides a list of admitted feeds.
 */
export class MemberStateMachine {
  private _creator: MemberInfo | undefined;

  /**
   * Member IDENTITY key => info
   */
  private _members = new ComplexMap<PublicKey, MemberInfo>(PublicKey.hash);

  readonly onMemberAdmitted = new Callback<AsyncCallback<MemberInfo>>();

  constructor(private readonly _spaceKey: PublicKey) {}

  get creator(): MemberInfo | undefined {
    return this._creator;
  }

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members;
  }

  getRole(member: PublicKey): SpaceMember.Role | undefined {
    return this._members.get(member)?.assertion.role;
  }

  /**
   * Processes the SpaceMember credential.
   * Assumes the credential is already pre-verified and the issuer has been authorized to issue credentials of this type.
   */
  async process(credential: Credential) {
    const assertion = getCredentialAssertion(credential);
    invariant(assertion['@type'] === 'dxos.halo.credentials.SpaceMember');
    invariant(assertion.spaceKey.equals(this._spaceKey));
    invariant(!this._members.has(credential.subject.id), `Duplicate SpaceMember credential: ${credential.subject.id}`);

    const info: MemberInfo = {
      key: credential.subject.id,
      credential,
      assertion,
      removed: false,
    };

    // NOTE: Assumes the first member processed is the creator.
    if (!this._creator) {
      this._creator = info;
    }

    this._members.set(credential.subject.id, info);
    log('member added', {
      member: credential.subject.id,
      space: this._spaceKey,
      role: assertion.role,
      profile: assertion.profile,
    });

    await this.onMemberAdmitted.callIfSet(info);
  }

  async onRevoked(revoked: Credential, revocation: Credential) {
    invariant(revoked.id);
    for (const member of this._members.values()) {
      if (member.credential.id?.equals(revoked.id)) {
        member.removed = true;
        break;
      }
    }
  }
}
