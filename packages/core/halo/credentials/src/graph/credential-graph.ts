//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type AsyncCallback, Callback, ComplexMap, ComplexSet } from '@dxos/util';

export class CredentialGraph<A, State> {
  /**
   * Local ids are used during traversals.
   */
  private _vertexIdGenerator = 1;
  /**
   * All credentials without parent references are connected to the root.
   */
  private _root = { id: -1, parents: [], children: [] } as any as ChainVertex<A>;
  /**
   * A credential which is not a parent of any other credential has the sentinel as a child.
   * Sentinel is a virtual merge-point of all credentials.
   */
  private _sentinel = { id: -2, parents: [], children: [] } as any as ChainVertex<A>;
  /**
   * Vertex references are used for fast credential inserts into the graph.
   */
  private _vertexByCredentialId = new ComplexMap<PublicKey, ChainVertex<A>>(PublicKey.hash);
  /**
   * The current state of the graph.
   */
  private _subjectToVertex = new ComplexMap<PublicKey, ChainVertex<A>>(PublicKey.hash);
  private _subjectToState = new ComplexMap<PublicKey, State>(PublicKey.hash);

  public onSubjectStateChanged = new Callback<AsyncCallback<State[]>>();

  constructor(private readonly _stateHandler: CredentialGraphStateHandler<A, State>) {}

  public getSubjectState(subjectId: PublicKey): State | undefined {
    return this._subjectToState.get(subjectId);
  }

  public getState(): ReadonlyMap<PublicKey, State> {
    return this._subjectToState;
  }

  public getLeafIds(): PublicKey[] {
    return this._sentinel.parents.map((v) => v.credential!.id!);
  }

  public getGlobalStateScope(): StateScope<A> {
    return { state: this._subjectToVertex };
  }

  public addVertex(credential: Credential, assertion: A): Promise<void> {
    const newVertex: ChainVertex<A> = {
      id: this._vertexIdGenerator++,
      credential,
      assertion,
      parents: [],
      children: [],
    };
    this._vertexByCredentialId.set(credential.id!, newVertex);
    const parentIds = credential.parentCredentialIds ?? [];
    if (parentIds.length === 0) {
      this._root.children.push(newVertex);
      newVertex.parents.push(this._root);
    } else {
      for (const parentId of parentIds) {
        const parentVertex = this._vertexByCredentialId.get(parentId);
        if (parentVertex == null) {
          log.error('credential skipped because of the unknown parent', { credential, parentId });
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

  private _removeSentinelConnection(vertex: ChainVertex<A>) {
    const sentinelIdx = vertex.children.indexOf(this._sentinel);
    if (sentinelIdx >= 0) {
      vertex.children.splice(sentinelIdx, 1);
      const vertexInSentinelIdx = this._sentinel.parents.indexOf(vertex);
      invariant(vertexInSentinelIdx >= 0);
      this._sentinel.parents.splice(vertexInSentinelIdx, 1);
    }
  }

  private async _onVertexInserted(newVertex: ChainVertex<A>) {
    const { credential, assertion } = newVertex;
    invariant(credential);
    let changedSubjects: State[] = [];
    const isUpdateAppliedOnTopOfThePreviousState = this._sentinel.parents.length === 1;
    if (isUpdateAppliedOnTopOfThePreviousState) {
      const subjectId = credential.subject.id;
      if (this._stateHandler.isUpdateAllowed(this.getGlobalStateScope(), credential, assertion)) {
        const newSubjectState = this._stateHandler.createState(credential, newVertex.assertion);
        const prevSubjectState = this._subjectToState.get(subjectId);
        this._subjectToState.set(subjectId, newSubjectState);
        this._subjectToVertex.set(subjectId, newVertex);
        if (this._stateHandler.hasStateChanged(newSubjectState, prevSubjectState)) {
          changedSubjects.push(newSubjectState);
        }
      }
    } else {
      changedSubjects = this._recomputeState();
    }
    if (changedSubjects.length > 0) {
      await this.onSubjectStateChanged.callIfSet(changedSubjects);
    }
  }

  /**
   * DFS the graph from root to sentinel pausing on merge points (nodes with multiple parents).
   * Continue after all paths leading to a merge point converge by merging their states.
   * In case of a concurrent update paths are replayed taking into account the state set
   * by the winning branch.
   */
  private _recomputeState(): State[] {
    // ID of a merge point to the list of paths that reached the point.
    const pendingPaths = new Map<number, PathState<A>[]>();
    const paths: PathState<A>[] = [this._createRootPath()];
    let lastPath: PathState<A> | null = null;
    while (lastPath == null) {
      const path = paths.pop()!;
      log('visit vertex', { id: path.head.id });
      this._updatePathState(path);
      const convergedPaths = this._handleMergePoint(paths, pendingPaths, path);
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
    return this._setCurrentState(lastPath);
  }

  private _replayFailedPaths(
    paths: PathState<A>[],
    pendingPaths: Map<number, PathState<A>[]>,
    mergeResult: ReplayRequiredMergeResult<A>,
    convergedPaths: PathState<A>[],
  ) {
    paths.push(
      ...mergeResult.replay.map((path) => {
        const stateOverrides = path.stateOverrides ?? new ComplexMap<PublicKey, ChainVertex<A>>(PublicKey.hash);
        mergeResult.stateOverrides.forEach((value, key) => stateOverrides.set(key, value));
        return { ...mergeResult.from, chosenPath: path.chosenPath, stateOverrides };
      }),
    );
    log('replay paths', () => ({
      count: paths.length,
      paths: paths.map((path) => ({
        from: mergeResult.from.head.id,
        path: toChosenPath(path),
        overrides: path?.stateOverrides?.mapValues((v) => this._stateHandler.toLogString(v.assertion)),
      })),
    }));
    const clearedPending = convergedPaths.filter((l) => !mergeResult.replay.includes(l));
    pendingPaths.set(convergedPaths[0].head.id, clearedPending);
  }

  private _handleMergePoint(
    paths: PathState<A>[],
    pendingPaths: Map<number, PathState<A>[]>,
    path: PathState<A>,
  ): PathState<A>[] | null {
    const pendingList = pendingPaths.get(path.head.id) ?? [];
    pendingPaths.set(path.head.id, pendingList);
    pendingList.push(path);
    if (pendingList.length < path.head.parents.length) {
      return null;
    }
    if (path.head.id === this._sentinel.id && paths.length > 0) {
      log('waiting for all the active paths to converge on the sentinel');
      return null;
    }
    pendingPaths.delete(path.head.id);
    return pendingList;
  }

  private _updatePathState(path: PathState<A>) {
    const headCredential = path.head.credential;
    if (headCredential == null) {
      return;
    }
    const updatedSubject = headCredential.subject.id;
    path.credentials.add(headCredential.id!);
    let isUpdateAllowed = this._stateHandler.isUpdateAllowed(path, headCredential, path.head.assertion);
    // Compatibility with old credentials where parent references were not specified.
    if (!isUpdateAllowed && path.head.parents[0]?.id === this._root.id) {
      const globalState = this.getGlobalStateScope();
      isUpdateAllowed = this._stateHandler.isUpdateAllowed(globalState, headCredential, path.head.assertion);
    }
    if (isUpdateAllowed) {
      path.forkChangedSubjects.add(updatedSubject);
      path.forkIssuers.add(headCredential.issuer);
      path.state.set(updatedSubject, path.head);
      log('path state updated', () => ({
        subject: updatedSubject,
        newState: this._stateHandler.toLogString(path.head.assertion),
      }));
    }
  }

  private _forkTraversal(paths: PathState<A>[], path: PathState<A>) {
    const replayChoice = path.chosenPath?.[path.head.id];
    const choices = replayChoice ?? path.head.children;
    for (const choice of choices) {
      log('edge traversal', { from: path.head.id, to: choice.id });
      const fork: PathState<A> = {
        forkPoint: path,
        chosenPath: { ...path.chosenPath, [path.head.id]: [choice] },
        head: choice,
        credentials: new ComplexSet(PublicKey.hash, path.credentials),
        state: new ComplexMap(PublicKey.hash, [...path.state.entries()]),
        forkIssuers: new ComplexSet(PublicKey.hash),
        forkChangedSubjects: new ComplexSet(PublicKey.hash),
        stateOverrides: path.stateOverrides,
      };
      paths.push(fork);
    }
  }

  /**
   * Updates the current graph state.
   * @returns changed states.
   */
  private _setCurrentState(path: PathState<A>): State[] {
    const changedSubjects: State[] = [];
    const newStateMap = new ComplexMap<PublicKey, State>(PublicKey.hash);
    const newVertexMap = new ComplexMap<PublicKey, ChainVertex<A>>(PublicKey.hash);
    for (const [subjectKey, subjectVertex] of path.state.entries()) {
      const newState = this._stateHandler.createState(subjectVertex.credential!, subjectVertex.assertion);
      const prevState = this._subjectToState.get(subjectKey);
      newStateMap.set(subjectKey, newState);
      newVertexMap.set(subjectKey, subjectVertex);
      if (this._stateHandler.hasStateChanged(newState, prevState)) {
        changedSubjects.push(newState);
      }
    }
    this._subjectToState = newStateMap;
    this._subjectToVertex = newVertexMap;
    return changedSubjects;
  }

  /*
   * Walk up all the fork points and return the first one present in all the paths.
   * We use local id to determine vertex position in the graph, because nodes can't
   * be inserted in the middle (between a parent and a child) and ids are monotonically increasing.
   */
  private _leastCommonAncestor(paths: PathState<A>[]): PathState<A> {
    const uniqueForkPoints = paths.reduce((acc, path) => {
      let it = path.forkPoint;
      while (it) {
        acc.set(it.head.id, it);
        it = it.forkPoint;
      }
      return acc;
    }, new Map<number, PathState<A>>());
    let maxId = this._root.id;
    let maxState: PathState<A> | null = null;
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

  /**
   * We might be merging paths where some of them had fork points after the initial forking.
   * We need all the paths to point to the least common fork point and contain all the changes
   * that happened after it.
   */
  private _moveUpToForkPoint(forkPoint: PathState<A>, path: PathState<A>): PathState<A> {
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
      it.forkChangedSubjects.forEach((m) => path.forkChangedSubjects.add(m));
      it = it!.forkPoint!;
      path.forkPoint = it;
    }
    return path;
  }

  private _mergePaths(convergedPaths: PathState<A>[]): PathMergeResult<A> {
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
    const result: PathState<A> = {
      forkPoint: forkPoint.forkPoint,
      chosenPath: { ...forkPoint.chosenPath, [forkPoint.head.id]: [] },
      stateOverrides: forkPoint.stateOverrides,
      credentials: new ComplexSet(PublicKey.hash, forkPoint.credentials),
      forkIssuers: new ComplexSet(PublicKey.hash, forkPoint.forkIssuers),
      forkChangedSubjects: new ComplexSet(PublicKey.hash, forkPoint.forkChangedSubjects),
      state: forkPoint.state.mapValues((v) => v),
      head: paths[0].head,
    };
    const subjectToBranch = new ComplexMap<PublicKey, PathState<A>>(PublicKey.hash);
    for (const path of paths) {
      log('processing a path', () => ({
        choices: toChosenPath(path),
        modified: path.forkChangedSubjects,
        forkIssuers: path.forkIssuers,
        state: path.state.mapValues((v) => this._stateHandler.toLogString(v.assertion)),
      }));
      path.forkIssuers.forEach((iss) => result.forkIssuers.add(iss));
      path.credentials.forEach((cred) => result.credentials.add(cred));
      result.chosenPath![forkPoint.head.id].push(...(path.chosenPath![forkPoint.head.id] ?? []));
      for (const modifiedSubject of path.forkChangedSubjects) {
        const existingBranch = subjectToBranch.get(modifiedSubject);
        if (existingBranch == null || this._shouldOverrideCredential(existingBranch, path, modifiedSubject)) {
          subjectToBranch.set(modifiedSubject, path);
        }
      }
    }
    const replayPaths = new Set<PathState<A>>();
    const addReplayPath = replayPaths.add.bind(replayPaths);
    for (const [subject, branch] of subjectToBranch.entries()) {
      result.forkChangedSubjects.add(subject);
      const vertex = branch.state.get(subject)!;
      result.state.set(subject, vertex);
      log('set subject state', () => ({ subject, state: this._stateHandler.toLogString(vertex.assertion) }));
      const otherPaths = paths.filter((p) => p !== branch);
      this._stateHandler.getConflictingPaths(otherPaths, vertex).forEach(addReplayPath);
    }
    if (replayPaths.size > 0) {
      return {
        type: 'replay_required',
        replay: [...replayPaths.values()],
        from: forkPoint,
        stateOverrides: subjectToBranch.mapValues((v, key) => v.state.get(key)!),
      };
    }
    return { type: 'merged', path: result };
  }

  /**
   * A candidate credential is preferred over the existing credential if:
   *  1. It is the merge-point, because it's the last credential that was issued in awareness of all
   *  the previously existing ones.
   *  2. A path where candidate was set contains existing credential in it, which means that the candidate
   *  was issued after the existing credential by a legitimate issuer.
   *  3. A state-specific logic (_stateHandler) is able to justify using the candidate credential.
   *  4. The path where candidate was set has more issuers than the existing path (longer branch).
   *  5. The issuance time of the candidate is after the issuance time of the existing credential (LWW).
   */
  private _shouldOverrideCredential(
    existing: PathState<A>,
    candidate: PathState<A>,
    modifiedSubject: PublicKey,
  ): boolean {
    const candidateVertex = candidate.state.get(modifiedSubject)!;
    const currentVertex = existing.state.get(modifiedSubject)!;
    if (candidateVertex.id === currentVertex.id) {
      return false;
    }
    // During merge all paths are pointing to the same head, which is the merge point.
    const mergePointId = existing.head.id;
    if (candidateVertex.id === mergePointId || currentVertex.id === mergePointId) {
      log('merge point chosen to break the tie', { mergePointId: existing.head.id });
      return mergePointId === candidateVertex.id;
    }
    const candidateCredential = candidateVertex.credential!;
    const currentCredential = currentVertex.credential!;
    // A credential is contained in a branch where another credential for this subject was issued.
    if (existing.credentials.has(candidateCredential.id!) !== candidate.credentials.has(currentCredential.id!)) {
      log('one of the credentials was overridden in another branch', {
        current: currentVertex.id,
        candidate: candidateVertex.id,
      });
      return candidate.credentials.has(currentCredential.id!);
    }
    // Give a chance to state-specific conflict resolution logic.
    const winningCredential = this._stateHandler.tryPickWinningUpdate(
      existing,
      currentCredential,
      candidate,
      candidateCredential,
    );
    if (winningCredential != null) {
      return winningCredential === candidateCredential;
    }
    if (candidate.forkIssuers.size !== existing.forkIssuers.size) {
      log('longer issuers branch used to break the tie', {
        issuerCount: [existing.forkIssuers.size, candidate.forkIssuers.size],
      });
      return candidate.forkIssuers.size > existing.forkIssuers.size;
    }
    log('issuance date used to break the tie');
    return candidateCredential.issuanceDate.getTime() > currentCredential.issuanceDate.getTime();
  }

  private _createRootPath(): PathState<A> {
    return {
      head: this._root,
      chosenPath: {},
      forkIssuers: new ComplexSet(PublicKey.hash),
      forkChangedSubjects: new ComplexSet(PublicKey.hash),
      state: new ComplexMap<PublicKey, ChainVertex<A>>(PublicKey.hash),
      credentials: new ComplexSet(PublicKey.hash),
    };
  }
}

export interface StateScope<A> {
  head?: { id: number };
  state: ReadonlyMap<PublicKey, ChainVertex<A>>;
  stateOverrides?: ReadonlyMap<PublicKey, ChainVertex<A>>;
}

export interface CredentialGraphStateHandler<Assertion, State> {
  hasStateChanged(s1?: State, s2?: State): boolean;

  createState(credential: Credential, assertion: Assertion): State;

  isUpdateAllowed: (scope: StateScope<Assertion>, update: Credential, assertion: Assertion) => boolean;

  getConflictingPaths(paths: PathState<Assertion>[], update: ChainVertex<Assertion>): PathState<Assertion>[];

  tryPickWinningUpdate(
    scope1: StateScope<Assertion>,
    update1: Credential,
    scope2: StateScope<Assertion>,
    update2: Credential,
  ): Credential | null;

  toLogString(assertion: Assertion): string;
}

export interface PathState<A> {
  /**
   * The current vertex position in path, always advances.
   */
  head: ChainVertex<A>;
  /**
   * Subject info local to the current path.
   */
  state: ComplexMap<PublicKey, ChainVertex<A>>;
  /**
   * Used during path replay to throw away cascading concurrent modifications.
   * Overrides pathState.
   */
  stateOverrides?: ComplexMap<PublicKey, ChainVertex<A>>;
  /**
   * Used to faster search of conflicting branches. Is different from pathState.keys()
   * because pathState is not reset on forks.
   */
  forkChangedSubjects: ComplexSet<PublicKey>;
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
  forkPoint?: PathState<A>;
  /**
   * Used for a particular path replay with stateOverrides for conflict resolution
   * forkVertexId is mapped to child vertex selection.
   * Contains choices that lead to the current state. Value is an array when
   * some branches converged before converging with the remaining branches.
   */
  chosenPath: { [forkVertexId: number]: ChainVertex<A>[] };
}

export interface ChainVertex<Assertion> {
  /**
   * The field is missing on root and sentinel vertices. Assertion is not undefined to avoid
   * always asserting two fields.
   */
  credential?: Credential;
  assertion: Assertion;
  /**
   * Local incrementing counter used to form paths. Is used only for causality resolution.
   */
  id: number;
  /**
   * Parents references are used to handle divergent branch merge-points.
   */
  parents: ChainVertex<Assertion>[];
  /**
   * Child references are traversed when computing the current state.
   */
  children: ChainVertex<Assertion>[];
}

type PathMergeResult<A> = SuccessfulMergeResult<A> | ReplayRequiredMergeResult<A>;

interface SuccessfulMergeResult<A> {
  type: 'merged';
  path: PathState<A>;
}

interface ReplayRequiredMergeResult<A> {
  type: 'replay_required';
  from: PathState<A>;
  replay: PathState<A>[];
  stateOverrides: ComplexMap<PublicKey, ChainVertex<A>>;
}

const toChosenPath = <A>(path: PathState<A>) => {
  return Object.fromEntries(Object.entries(path.chosenPath!).map(([k, vs]) => [k, vs.map((v) => v.id)]));
};
