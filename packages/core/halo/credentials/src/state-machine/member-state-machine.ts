//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Credential, SpaceMember, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type AsyncCallback, Callback, ComplexMap, ComplexSet } from '@dxos/util';

import { getCredentialAssertion } from '../credentials';

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
export class MemberStateMachine {
  private _ownerKey: PublicKey | undefined;

  /**
   * Member IDENTITY key => info
   */
  private _members = new ComplexMap<PublicKey, MemberInfo>(PublicKey.hash);
  private _memberProfiles = new ComplexMap<PublicKey, ProfileDocument | undefined>(PublicKey.hash);

  /**
   * Local ids used during traversals.
   */
  private _vertexIdGenerator = 1;
  /**
   * All credentials without parent references are connected to root.
   */
  private _root = { id: -1, parents: [], children: [] } as any as ChainVertex;
  /**
   * A credential which is not a parent of any other credential has sentinel as a child.
   * Sentinel is a virtual merge-point of all credentials.
   */
  private _sentinel = { id: -2, parents: [], children: [] } as any as ChainVertex;
  /**
   * Keep vertex references for fast credential inserts into graph.
   */
  private _vertexByCredentialId = new ComplexMap<PublicKey, ChainVertex>(PublicKey.hash);

  readonly onMemberRoleChanged = new Callback<AsyncCallback<MemberInfo[]>>();

  constructor(private readonly _spaceKey: PublicKey) {}

  get creator(): MemberInfo | undefined {
    return this._ownerKey && this._members.get(this._ownerKey);
  }

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members;
  }

  get membershipChainHeads(): PublicKey[] {
    return this._sentinel.parents.map((v) => v.credential!.id!);
  }

  getRole(member: PublicKey): SpaceMember.Role {
    return this._getRole(null, member);
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
        await this._updateMemberRoleAssignment(credential, assertion);
        break;
      }
      case 'dxos.halo.credentials.MemberProfile': {
        const member = this._members.get(credential.subject.id);
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

  private async _updateMemberRoleAssignment(credential: Credential, assertion: SpaceMember): Promise<void> {
    const newVertex: ChainVertex = {
      id: this._vertexIdGenerator++,
      credential,
      assertion,
      parents: [],
      children: [],
    };
    this._vertexByCredentialId.set(credential.id!, newVertex);
    const parentIds = assertion.membershipChainHeads ?? [];
    if (parentIds.length === 0) {
      this._root.children.push(newVertex);
      newVertex.parents.push(this._root);
    } else {
      for (const parentId of parentIds) {
        const parentVertex = this._vertexByCredentialId.get(parentId);
        if (parentVertex == null) {
          log.error('credential skipped because has unknown parent', { credential, parentId });
          continue;
        }
        parentVertex.children.push(newVertex);
        newVertex.parents.push(parentVertex);
        this._removeSentinelConnection(parentVertex);
      }
    }
    newVertex.children.push(this._sentinel);
    this._sentinel.parents.push(newVertex);
    return this._onVertexInserted(newVertex);
  }

  private _removeSentinelConnection(vertex: ChainVertex) {
    const sentinelIdx = vertex.children.indexOf(this._sentinel);
    if (sentinelIdx >= 0) {
      vertex.children.splice(sentinelIdx, 1);
      const vertexInSentinelIdx = this._sentinel.parents.indexOf(vertex);
      invariant(vertexInSentinelIdx >= 0);
      this._sentinel.parents.splice(vertexInSentinelIdx, 1);
    }
  }

  private async _onVertexInserted(newVertex: ChainVertex) {
    invariant(newVertex.credential);
    let changedMembers: MemberInfo[] = [];
    const hasAppendedNewVertex = this._sentinel.parents.length === 1;
    if (hasAppendedNewVertex) {
      if (this._isUpdateAllowed(null, newVertex)) {
        const memberInfo = this._toMemberInfo(newVertex);
        this._members.set(newVertex.credential.subject.id, memberInfo);
        changedMembers = [memberInfo];
      }
    } else {
      changedMembers = this._recomputeMembershipState();
    }
    if (changedMembers.length > 0) {
      await this.onMemberRoleChanged.callIfSet(changedMembers);
    }
  }

  /**
   * DFS the graph from root to sentinel pausing on merge points (nodes with multiple parents).
   * Continue after all paths leading to a merge point converge by merging their states.
   * In case of a concurrent update paths are replayed taking into account the state set
   * by the winning branch.
   * A credential wins:
   *  1. the one issued by the owner
   *  2. or the one where in whose branch more issuers participated
   *  3. or the one with lower issuance data
   */
  private _recomputeMembershipState(): MemberInfo[] {
    // id of merge point to the list of paths that reached the point
    const pendingPaths = new Map<number, PathState[]>();
    const paths: PathState[] = [this._createRootPath()];
    let lastPath: PathState | null = null;
    while (lastPath == null) {
      const path = paths.pop()!;
      log('visit vertex', { id: path.head.id });
      this._updatePathState(path);
      const convergedPaths = this._handleMergePoint(pendingPaths, path);
      if (convergedPaths == null) {
        log('waiting for other paths');
        continue;
      }
      const mergeResult = this._mergePaths(convergedPaths);
      if (mergeResult.type === 'replay_required') {
        this._replayFailedPaths(paths, pendingPaths, mergeResult, convergedPaths);
        continue;
      }
      const merged = mergeResult.path;
      if (merged.head.children.length === 0) {
        lastPath = merged;
      } else if (merged.head.children.length === 1) {
        merged.head = merged.head.children[0];
        paths.push(merged);
      } else {
        this._forkTraversal(paths, merged);
      }
    }
    if (paths.length > 0) {
      log.error('traversal finished while there were active paths', {
        paths: paths.map((p) => ({ path: toChosenPath(p), head: p.head.id })),
      });
    }
    return this._setCurrentState(lastPath.state);
  }

  private _replayFailedPaths(
    paths: PathState[],
    pendingPaths: Map<number, PathState[]>,
    mergeResult: ReplayRequiredMergeResult,
    convergedPaths: PathState[],
  ) {
    paths.push(
      ...mergeResult.replay.map((path) => {
        const stateOverrides = path.stateOverrides ?? new ComplexMap<PublicKey, ChainVertex>(PublicKey.hash);
        mergeResult.stateOverrides.forEach((value, key) => stateOverrides.set(key, value));
        return { ...mergeResult.from, chosenPath: path.chosenPath, stateOverrides };
      }),
    );
    log('replay paths', () => ({
      count: paths.length,
      paths: paths.map((path) => ({
        from: mergeResult.from.head.id,
        path: toChosenPath(path),
        overrides: path?.stateOverrides?.mapValues((v) => v.assertion.role),
      })),
    }));
    const clearedPending = convergedPaths.filter((l) => !mergeResult.replay.includes(l));
    pendingPaths.set(convergedPaths[0].head.id, clearedPending);
  }

  private _handleMergePoint(pendingPaths: Map<number, PathState[]>, path: PathState): PathState[] | null {
    const pendingList = pendingPaths.get(path.head.id) ?? [];
    pendingList.push(path);
    if (pendingList.length < path.head.parents.length) {
      pendingPaths.set(path.head.id, pendingList);
      return null;
    }
    pendingPaths.delete(path.head.id);
    return pendingList;
  }

  private _updatePathState(path: PathState) {
    if (path.head.credential == null) {
      return;
    }
    path.credentials.add(path.head.credential.id!);
    if (this._isUpdateAllowed(path, path.head)) {
      const updatedMember = path.head.credential.subject;
      path.forkChangedMembers.add(updatedMember.id);
      path.forkIssuers.add(path.head.credential.issuer);
      path.state.set(updatedMember.id, path.head);
      log('path state updated', {
        member: updatedMember.id,
        newRole: path.head.assertion.role,
      });
    }
  }

  private _forkTraversal(paths: PathState[], path: PathState) {
    const replayChoice = path.chosenPath?.[path.head.id];
    const choices = replayChoice ?? path.head.children;
    for (const choice of choices) {
      log('edge traversal', { from: path.head.id, to: choice.id });
      const fork: PathState = {
        forkPoint: path,
        chosenPath: { ...path.chosenPath, [path.head.id]: [choice] },
        head: choice,
        credentials: new ComplexSet(PublicKey.hash, path.credentials),
        state: new ComplexMap<PublicKey, ChainVertex>(PublicKey.hash, [...path.state.entries()]),
        forkIssuers: new ComplexSet(PublicKey.hash),
        forkChangedMembers: new ComplexSet<PublicKey>(PublicKey.hash),
        stateOverrides: path.stateOverrides,
      };
      paths.push(fork);
    }
  }

  /**
   * Updates state-machine state.
   * @returns changed members.
   */
  private _setCurrentState(pathState: PathState['state']) {
    const changedMembers: MemberInfo[] = [];
    const newState = new ComplexMap<PublicKey, MemberInfo>(PublicKey.hash);
    for (const [memberKey, memberVertex] of pathState.entries()) {
      const memberInfo = this._toMemberInfo(memberVertex);
      newState.set(memberKey, memberInfo);
      const existingRole = this._members.get(memberKey)?.role;
      if (existingRole !== memberVertex.assertion.role) {
        changedMembers.push(memberInfo);
      }
    }
    this._members = newState;
    return changedMembers;
  }

  /*
   * Walk up all the fork points and return the first one present in all the paths.
   * We use local id to determine vertex position in the graph, because nodes can't
   * be inserted in the middle (between a parent and a child) and ids are monotonically increasing.
   */
  private _leastCommonAncestor(paths: PathState[]): PathState {
    const uniqueForkPoints = paths.reduce((acc, path) => {
      let it = path.forkPoint;
      while (it) {
        acc.set(it.head.id, it);
        it = it.forkPoint;
      }
      return acc;
    }, new Map<number, PathState>());
    let maxId = this._root.id;
    let maxState: PathState | null = null;
    for (const [id, state] of uniqueForkPoints.entries()) {
      const headCredential = state.head.credential;
      if (headCredential != null) {
        const isPointInEveryPath = paths.every((p) => p.credentials.has(headCredential.id!));
        if (isPointInEveryPath && id > maxId) {
          maxId = id;
          maxState = state;
        }
      }
    }
    return maxState ?? this._createRootPath();
  }

  private _moveUpToForkPoint(forkPoint: PathState, path: PathState): PathState {
    const isForkPointInPath = path.chosenPath[forkPoint.head.id] == null || path.forkPoint == null;
    if (isForkPointInPath) {
      return path;
    }
    if (forkPoint.head.id === path.forkPoint?.head.id) {
      return path;
    }
    let it = path.forkPoint!;
    while (it.head.id !== forkPoint.head.id) {
      it.forkIssuers.forEach((iss) => path.forkIssuers.add(iss));
      it.forkChangedMembers.forEach((m) => path.forkChangedMembers.add(m));
      it = it!.forkPoint!;
      path.forkPoint = it;
    }
    return path;
  }

  private _mergePaths(convergedPaths: PathState[]): PathMergeResult {
    invariant(convergedPaths.length >= 1);
    if (convergedPaths.length === 1) {
      return { type: 'merged', path: convergedPaths[0] };
    }
    const forkPoint = this._leastCommonAncestor(convergedPaths);
    log('merging paths', () => ({
      forkPointId: forkPoint.head.id,
      pathCount: convergedPaths.length,
      forkPoints: convergedPaths.map((fp) => fp.forkPoint?.head.id),
    }));
    const paths = convergedPaths.map((p) => this._moveUpToForkPoint(forkPoint, p));
    invariant(forkPoint);
    const result: PathState = {
      forkPoint: forkPoint.forkPoint,
      chosenPath: { ...forkPoint.chosenPath, [forkPoint.head.id]: [] },
      stateOverrides: forkPoint.stateOverrides,
      credentials: new ComplexSet(PublicKey.hash, forkPoint.credentials),
      forkIssuers: new ComplexSet(PublicKey.hash, forkPoint.forkIssuers),
      forkChangedMembers: new ComplexSet(PublicKey.hash, forkPoint.forkChangedMembers),
      state: forkPoint.state.mapValues((v) => v),
      head: paths[0].head,
    };
    const memberToBranches = new ComplexMap<PublicKey, PathState>(PublicKey.hash);
    for (const path of paths) {
      log('processing a path', () => ({
        choices: toChosenPath(path),
        modified: path.forkChangedMembers,
        forkIssuers: path.forkIssuers,
        state: path.state.mapValues((v) => v.assertion.role),
      }));
      path.forkIssuers.forEach((iss) => result.forkIssuers.add(iss));
      path.credentials.forEach((cred) => result.credentials.add(cred));
      result.chosenPath![forkPoint.head.id].push(...(path.chosenPath![forkPoint.head.id] ?? []));
      for (const modifiedMember of path.forkChangedMembers) {
        const existingBranch = memberToBranches.get(modifiedMember);
        if (existingBranch == null || this._shouldOverrideCredential(existingBranch, path, modifiedMember)) {
          memberToBranches.set(modifiedMember, path);
        }
      }
    }
    const replayPaths = new Set<PathState>();
    for (const [member, branch] of memberToBranches.entries()) {
      result.forkChangedMembers.add(member);
      const vertex = branch.state.get(member)!;
      result.state.set(member, vertex);
      log('set member role', { member, role: vertex.assertion.role });
      if (vertex.assertion.role === SpaceMember.Role.REMOVED || vertex.assertion.role === SpaceMember.Role.EDITOR) {
        for (const path of paths) {
          // a member can't be an issuer in a concurrent branch if we decided to remove or revoke admin permissions during merge
          if (path !== branch && path.forkIssuers.has(member)) {
            replayPaths.add(path);
          }
        }
      }
    }
    if (replayPaths.size > 0) {
      return {
        type: 'replay_required',
        replay: [...replayPaths.values()],
        from: forkPoint,
        stateOverrides: memberToBranches.mapValues((v, key) => v.state.get(key)!),
      };
    }
    return { type: 'merged', path: result };
  }

  private _shouldOverrideCredential(existing: PathState, candidate: PathState, modifiedMember: PublicKey): boolean {
    const candidateVertex = candidate.state.get(modifiedMember)!;
    const currentVertex = existing.state.get(modifiedMember)!;
    if (candidateVertex.id === currentVertex.id) {
      return false;
    }
    // during merge all paths are pointing to the same head, which is the merge point
    const mergePointId = existing.head.id;
    if (candidateVertex.id === mergePointId || currentVertex.id === mergePointId) {
      log('merge point chosen to break the tie', { mergePointId: existing.head.id });
      return mergePointId === candidateVertex.id;
    }
    const candidateCredential = candidateVertex.credential!;
    const currentCredential = currentVertex.credential!;
    // a credential is contained in a branch where another credential for this member was issued
    if (existing.credentials.has(candidateCredential.id!) !== candidate.credentials.has(currentCredential.id!)) {
      log('one of the credentials was overridden in another branch', {
        current: currentVertex.id,
        candidate: candidateVertex.id,
      });
      return candidate.credentials.has(currentCredential.id!);
    }
    const candidatesIssuerRole = this._getRole(candidate, candidateCredential.issuer);
    const currentIssuerRole = this._getRole(existing, currentCredential.issuer);
    if ((currentIssuerRole === SpaceMember.Role.OWNER) !== (candidatesIssuerRole === SpaceMember.Role.OWNER)) {
      log('owner decision used to break the tie');
      return candidatesIssuerRole === SpaceMember.Role.OWNER;
    }
    if (candidate.forkIssuers.size !== existing.forkIssuers.size) {
      log('longer issuers branch used to break the tie', {
        issuerCount: [existing.forkIssuers.size, candidate.forkIssuers.size],
      });
      return candidate.forkIssuers.size > existing.forkIssuers.size;
    }
    log('issuance date used to break the tie');
    return candidateCredential.issuanceDate.getTime() < currentCredential.issuanceDate.getTime();
  }

  private _isUpdateAllowed(state: PathState | null, update: ChainVertex): boolean {
    if (update.credential == null) {
      // vertex contains no update
      return false;
    }
    if (update.assertion.role === SpaceMember.Role.OWNER) {
      return update.credential!.issuer.equals(this._spaceKey);
    }
    const isChangingOwnerRole = this._getRole(state, update.credential.subject.id) === SpaceMember.Role.OWNER;
    if (isChangingOwnerRole) {
      return false;
    }
    const issuer = update.credential.issuer;
    const isChangingOwnRole = issuer.equals(update.credential.subject.id);
    if (isChangingOwnRole) {
      return false;
    }
    if (issuer.equals(update.assertion.spaceKey)) {
      return true;
    }
    const issuerRole = this._getRole(state, issuer);
    return issuerRole === SpaceMember.Role.ADMIN || issuerRole === SpaceMember.Role.OWNER;
  }

  private _getRole(state: PathState | null, memberId: PublicKey): SpaceMember.Role {
    if (this._ownerKey?.equals(memberId)) {
      return SpaceMember.Role.OWNER;
    }
    if (state == null) {
      return this._members.get(memberId)?.assertion.role ?? SpaceMember.Role.REMOVED;
    }
    const realRole = state.state.get(memberId)?.assertion?.role ?? SpaceMember.Role.REMOVED;
    if (state.stateOverrides != null) {
      const override = state.stateOverrides.get(memberId);
      if (override != null) {
        log('member role overridden in path', {
          headId: state.head.id,
          roleOverride: override.assertion.role,
          realRole,
        });
        return override.assertion.role;
      }
    }
    return realRole;
  }

  private _toMemberInfo(vertex: ChainVertex): MemberInfo {
    invariant(vertex.credential);
    const memberKey = vertex.credential.subject.id;
    return {
      key: memberKey,
      role: vertex.assertion.role,
      credential: vertex.credential,
      assertion: vertex.assertion,
      profile: this._memberProfiles.get(memberKey),
    };
  }

  private _createRootPath(): PathState {
    return {
      head: this._root,
      chosenPath: {},
      forkIssuers: new ComplexSet(PublicKey.hash),
      forkChangedMembers: new ComplexSet<PublicKey>(PublicKey.hash),
      state: new ComplexMap<PublicKey, ChainVertex>(PublicKey.hash),
      credentials: new ComplexSet<PublicKey>(PublicKey.hash),
    };
  }
}

interface PathState {
  /**
   * The current vertex position in path, always advances.
   */
  head: ChainVertex;
  /**
   * Member info local to the current path.
   */
  state: ComplexMap<PublicKey, ChainVertex>;
  /**
   * Used during path replay to throw away cascading concurrent modifications.
   * Overrides pathState.
   */
  stateOverrides?: ComplexMap<PublicKey, ChainVertex>;
  /**
   * Used to faster search of conflicting branches. Is different from pathState.keys()
   * because pathState is not reset on forks.
   */
  forkChangedMembers: ComplexSet<PublicKey>;
  /**
   * Used to find winning branches. A branch wins if it had more participants.
   * Ties are broken using credential issuance date.
   */
  forkIssuers: ComplexSet<PublicKey>;
  /**
   * All the credentials processed during this path traversal.
   */
  credentials: ComplexSet<PublicKey>;
  /**
   * PathState where we had multiple children in the current vertex.
   * Will be merged with child branches when they converge.
   */
  forkPoint?: PathState;
  /**
   * Used for a particular path replay with stateOverrides for conflict resolution
   * forkVertexId is mapped to child vertex selection.
   * Contains choices that lead to the current state. Value is an array when
   * some branches converged before converging with the remaining branches.
   */
  chosenPath: { [forkVertexId: number]: ChainVertex[] };
}

interface ChainVertex {
  /**
   * The field is missing on root and sentinel vertices. Assertion is not undefined to avoid
   * always asserting two fields.
   */
  credential?: Credential;
  assertion: SpaceMember;
  /**
   * Local incrementing counter used to form paths. Is used only for causality resolution.
   */
  id: number;
  /**
   * Parents references are used to handle divergent branch merge-points.
   */
  parents: ChainVertex[];
  /**
   * Child references are traversed when computing the current membership state.
   */
  children: ChainVertex[];
}

type PathMergeResult = SuccessfulMergeResult | ReplayRequiredMergeResult;

interface SuccessfulMergeResult {
  type: 'merged';
  path: PathState;
}

interface ReplayRequiredMergeResult {
  type: 'replay_required';
  from: PathState;
  replay: PathState[];
  stateOverrides: ComplexMap<PublicKey, ChainVertex>;
}

const toChosenPath = (path: PathState) => {
  return Object.fromEntries(Object.entries(path.chosenPath!).map(([k, vs]) => [k, vs.map((v) => v.id)]));
};
