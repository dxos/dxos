//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Credential, SpaceMember, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { getCredentialAssertion } from '../credentials';
import {
  type ChainVertex,
  CredentialGraph,
  type CredentialGraphStateHandler,
  type PathState,
  type StateScope,
} from '../graph/credential-graph';

export interface MemberInfo {
  key: PublicKey;
  role: SpaceMember.Role;
  credential: Credential;
  assertion: SpaceMember;
  profile?: ProfileDocument;
}

/**
 * Tracks the list of members (with roles) for the space.
 * Provides a list of admitted feeds.
 */
export class MemberStateMachine implements CredentialGraphStateHandler<SpaceMember, MemberInfo> {
  private _ownerKey: PublicKey | undefined;
  private _memberProfiles = new ComplexMap<PublicKey, ProfileDocument | undefined>(PublicKey.hash);
  private _hashgraph = new CredentialGraph<SpaceMember, MemberInfo>(this);

  readonly onMemberRoleChanged = this._hashgraph.onSubjectStateChanged;

  constructor(private readonly _spaceKey: PublicKey) {}

  get creator(): MemberInfo | undefined {
    return this._ownerKey && this._hashgraph.getSubjectState(this._ownerKey);
  }

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._hashgraph.getState();
  }

  get membershipChainHeads(): PublicKey[] {
    return this._hashgraph.getLeafIds();
  }

  getRole(member: PublicKey): SpaceMember.Role {
    return this._getRole(this._hashgraph.getGlobalStateScope(), member);
  }

  /**
   * Processes the SpaceMember credential.
   * Assumes the credential is already pre-verified and the issuer has been authorized to issue credentials of this type.
   */
  async process(credential: Credential) {
    const assertion = getCredentialAssertion(credential);

    switch (assertion['@type']) {
      case 'dxos.halo.credentials.SpaceMember': {
        invariant(assertion.spaceKey.equals(this._spaceKey));
        if (this._ownerKey == null && credential.issuer === this._spaceKey) {
          this._ownerKey = credential.subject.id;
        }
        if (assertion.profile != null) {
          this._memberProfiles.set(credential.subject.id, assertion.profile);
        }
        await this._hashgraph.addVertex(credential, assertion);
        break;
      }
      case 'dxos.halo.credentials.MemberProfile': {
        const member = this._hashgraph.getSubjectState(credential.subject.id);
        if (member) {
          member.profile = assertion.profile;
        } else {
          log.warn('Member not found', { id: credential.subject.id });
        }
        this._memberProfiles.set(credential.subject.id, assertion.profile);
        break;
      }
      default:
        throw new Error('Invalid assertion type');
    }
  }

  public createState(credential: Credential, assertion: SpaceMember): MemberInfo {
    const memberKey = credential.subject.id;
    return {
      key: memberKey,
      role: assertion.role,
      credential,
      assertion,
      profile: this._memberProfiles.get(memberKey),
    };
  }

  public isUpdateAllowed(scope: StateScope<SpaceMember>, credential: Credential, assertion: SpaceMember) {
    if (assertion.role === SpaceMember.Role.OWNER) {
      return credential!.issuer.equals(this._spaceKey);
    }
    const issuer = credential.issuer;
    const isChangingOwnRole = issuer.equals(credential.subject.id);
    if (isChangingOwnRole) {
      return false;
    }
    if (issuer.equals(assertion.spaceKey)) {
      return true;
    }
    const issuerRole = this._getRole(scope, issuer);
    return issuerRole === SpaceMember.Role.ADMIN || issuerRole === SpaceMember.Role.OWNER;
  }

  public getConflictingPaths(
    paths: PathState<SpaceMember>[],
    update: ChainVertex<SpaceMember>,
  ): PathState<SpaceMember>[] {
    // a member can't be an issuer in a concurrent branch if we decided to remove or revoke admin permissions during merge
    if (update.assertion.role !== SpaceMember.Role.REMOVED && update.assertion.role !== SpaceMember.Role.EDITOR) {
      return [];
    }
    const memberId = update.credential!.subject.id!;
    return paths.filter((p) => p.forkIssuers.has(memberId));
  }

  public tryPickWinningUpdate(
    scope1: StateScope<SpaceMember>,
    update1: Credential,
    scope2: StateScope<SpaceMember>,
    update2: Credential,
  ): Credential | null {
    const path1IssuerRole = this._getRole(scope1, update1.issuer);
    const path2IssuerRole = this._getRole(scope2, update2.issuer);
    if ((path2IssuerRole === SpaceMember.Role.OWNER) !== (path1IssuerRole === SpaceMember.Role.OWNER)) {
      log('owner decision used to break the tie');
      return path1IssuerRole === SpaceMember.Role.OWNER ? update1 : update2;
    }
    return null;
  }

  public toLogString(assertion: SpaceMember | undefined): string {
    const role = assertion?.role ?? SpaceMember.Role.REMOVED;
    return Object.entries(SpaceMember.Role).find(([_, value]) => value === role)![0];
  }

  public hasStateChanged(s1?: MemberInfo, s2?: MemberInfo): boolean {
    return s1?.role !== s2?.role;
  }

  private _getRole(scope: StateScope<SpaceMember>, memberId: PublicKey): SpaceMember.Role {
    if (this._ownerKey?.equals(memberId)) {
      return SpaceMember.Role.OWNER;
    }
    const realRole = scope.state.get(memberId)?.assertion?.role ?? SpaceMember.Role.REMOVED;
    if (scope.stateOverrides != null) {
      const override = scope.stateOverrides.get(memberId);
      if (override != null) {
        log('member role overridden in path', () => ({
          headId: scope.head?.id,
          roleOverride: this.toLogString(override.assertion),
          realRole: this.toLogString(scope.state.get(memberId)?.assertion),
        }));
        return override.assertion.role;
      }
    }
    return realRole;
  }
}
