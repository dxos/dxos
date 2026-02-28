//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import {
  type Credential,
  type ProfileDocument,
  type SpaceMember,
  SpaceMember_Role,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ComplexMap } from '@dxos/util';

import { fromBufPublicKey, getCredentialAssertion } from '../credentials';
import {
  type ChainVertex,
  CredentialGraph,
  type CredentialGraphStateHandler,
  type PathState,
  type StateScope,
} from '../graph/credential-graph';

/** Safe numeric cast between protobuf.js and buf enums (identical wire values). */
const toBufRole = (role: number): SpaceMember_Role => role as SpaceMember_Role;

export interface MemberInfo {
  key: PublicKey;
  role: SpaceMember_Role;
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

  getRole(member: PublicKey): SpaceMember_Role {
    return this._getRole(this._hashgraph.getGlobalStateScope(), member);
  }

  /**
   * Processes the SpaceMember credential.
   * Assumes the credential is already pre-verified and the issuer has been authorized to issue credentials of this type.
   */
  async process(credential: Credential): Promise<void> {
    const assertion = getCredentialAssertion(credential);
    const subjectId = fromBufPublicKey(credential.subject!.id!)!;
    const issuer = fromBufPublicKey(credential.issuer!)!;

    switch (assertion.$typeName) {
      case 'dxos.halo.credentials.SpaceMember': {
        invariant(assertion.spaceKey && toPublicKey(assertion.spaceKey).equals(this._spaceKey));
        if (this._ownerKey == null && issuer.equals(this._spaceKey)) {
          this._ownerKey = subjectId;
        }
        if (assertion.profile != null) {
          this._memberProfiles.set(subjectId, assertion.profile);
        }
        await this._hashgraph.addVertex(credential, assertion);
        break;
      }
      case 'dxos.halo.credentials.MemberProfile': {
        const member = this._hashgraph.getSubjectState(subjectId);
        if (member) {
          member.profile = assertion.profile;
        } else {
          log.warn('Member not found', { id: subjectId });
        }
        this._memberProfiles.set(subjectId, assertion.profile);
        break;
      }
      default:
        throw new Error('Invalid assertion type');
    }
  }

  public createState(credential: Credential, assertion: SpaceMember): MemberInfo {
    const memberKey = fromBufPublicKey(credential.subject!.id!)!;
    return {
      key: memberKey,
      role: toBufRole(assertion.role),
      credential,
      assertion,
      profile: this._memberProfiles.get(memberKey),
    };
  }

  public isUpdateAllowed(scope: StateScope<SpaceMember>, credential: Credential, assertion: SpaceMember): boolean {
    const issuer = fromBufPublicKey(credential.issuer!)!;
    const subjectId = fromBufPublicKey(credential.subject!.id!)!;

    if (toBufRole(assertion.role) === SpaceMember_Role.OWNER) {
      return issuer.equals(this._spaceKey);
    }
    const isChangingOwnRole = issuer.equals(subjectId);
    if (isChangingOwnRole) {
      return false;
    }
    if (assertion.spaceKey && issuer.equals(fromBufPublicKey(assertion.spaceKey)!)) {
      return true;
    }
    const issuerRole = this._getRole(scope, issuer);
    return issuerRole === SpaceMember_Role.ADMIN || issuerRole === SpaceMember_Role.OWNER;
  }

  public getConflictingPaths(
    paths: PathState<SpaceMember>[],
    update: ChainVertex<SpaceMember>,
  ): PathState<SpaceMember>[] {
    // a member can't be an issuer in a concurrent branch if we decided to remove or revoke admin permissions during merge
    const updateRole = toBufRole(update.assertion.role);
    if (updateRole !== SpaceMember_Role.REMOVED && updateRole !== SpaceMember_Role.EDITOR) {
      return [];
    }
    const memberId = fromBufPublicKey(update.credential!.subject!.id!)!;
    return paths.filter((p) => p.forkIssuers.has(memberId));
  }

  public tryPickWinningUpdate(
    scope1: StateScope<SpaceMember>,
    update1: Credential,
    scope2: StateScope<SpaceMember>,
    update2: Credential,
  ): Credential | null {
    const path1IssuerRole = this._getRole(scope1, fromBufPublicKey(update1.issuer!)!);
    const path2IssuerRole = this._getRole(scope2, fromBufPublicKey(update2.issuer!)!);
    if ((path2IssuerRole === SpaceMember_Role.OWNER) !== (path1IssuerRole === SpaceMember_Role.OWNER)) {
      log('owner decision used to break the tie');
      return path1IssuerRole === SpaceMember_Role.OWNER ? update1 : update2;
    }
    return null;
  }

  public toLogString(assertion: SpaceMember | undefined): string {
    const role = assertion?.role != null ? toBufRole(assertion.role) : SpaceMember_Role.REMOVED;
    return Object.entries(SpaceMember_Role).find(([_, value]) => value === role)![0];
  }

  public hasStateChanged(s1?: MemberInfo, s2?: MemberInfo): boolean {
    return s1?.role !== s2?.role;
  }

  private _getRole(scope: StateScope<SpaceMember>, memberId: PublicKey): SpaceMember_Role {
    if (this._ownerKey?.equals(memberId)) {
      return SpaceMember_Role.OWNER;
    }
    const memberAssertion = scope.state.get(memberId)?.assertion;
    const realRole = memberAssertion?.role != null ? toBufRole(memberAssertion.role) : SpaceMember_Role.REMOVED;
    if (scope.stateOverrides != null) {
      const override = scope.stateOverrides.get(memberId);
      if (override != null) {
        log('member role overridden in path', () => ({
          headId: scope.head?.id,
          roleOverride: this.toLogString(override.assertion),
          realRole: this.toLogString(scope.state.get(memberId)?.assertion),
        }));
        return toBufRole(override.assertion.role);
      }
    }
    return realRole;
  }
}
