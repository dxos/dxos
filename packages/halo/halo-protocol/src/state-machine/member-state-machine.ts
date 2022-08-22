import { PublicKey } from "@dxos/protocols";
import { AdmittedFeed, Credential, PartyMember } from "../proto";
import assert from 'assert'
import { getCredentialAssertion } from "../credentials";
import { ComplexMap } from "@dxos/util";
import { Event } from '@dxos/async';

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
  private _members = new ComplexMap<PublicKey, MemberInfo>(x => x.toHex())

  readonly memberAdmitted = new Event<MemberInfo>();

  constructor(
    private readonly _partyKey: PublicKey
  ) {}

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members;
  }

  getRoles(member: PublicKey): PartyMember.Role[] {
    return this._members.get(member)?.assertion.roles ?? [];
  }

  /**
   * Processes the PartyMember credential.
   * Assumes the credential is already pre-verified
   * and the issuer has been authorized to issue credentials of this type.
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  process(credential: Credential) {
    const assertion = getCredentialAssertion(credential)
    assert(assertion["@type"] === 'dxos.halo.credentials.PartyMember')
    assert(assertion.partyKey.equals(this._partyKey));
    assert(!this._members.has(credential.subject.id));

    const info: MemberInfo = {
      key: credential.subject.id,
      credential,
      assertion,
    };
    this._members.set(credential.subject.id, info)
    this.memberAdmitted.emit(info)
  }
}