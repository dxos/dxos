//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc, type Heads } from '@automerge/automerge';

import { type Migration, type Obj } from '@dxos/echo';
import {
  type ChangeGraph,
  ancestorsOf,
  applyStructuralEdit,
  encodedValuesEqual,
  frontierOf,
  isRecord,
} from '@dxos/echo-host/versions';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { getObjectCore } from '../echo-handler/index.ts';

//
// Peers that migrate one object before receiving each other's migration each write their own lists,
// maps and text into its target properties. Automerge shows one per property, so edits a user made
// inside another would be lost. As the convergence-key merger replays a losing duplicate object's edits
// onto the survivor, this replays edits made inside a losing migration's containers onto the visible
// one. Late old-shape writes need nothing here: every migration's step folds them into its own
// containers, and the visible one either already held them or folds them itself.
//

/** Change messages the migration runner writes, which are never user edits to replay. */
const RUNNER_MESSAGE = /^(migration|fold|checkpoint|replay):/;

/** The message a replay onto `winner`'s container at `key` is stamped with, followed by the replayed change. */
const replayPrefix = (objectId: string, key: string, winner: string): string =>
  `replay: [${objectId}:${key}] ${winner} `;

/** The change that wrote op `opId` (`counter@actor`), among `changes`. */
const changeOfOp = (changes: readonly A.ChangeMetadata[], opId: string): A.ChangeMetadata | undefined => {
  const [counter, actor] = opId.split('@');
  const op = Number(counter);
  return changes.find((change) => change.actor === actor && change.startOp <= op && op <= change.maxOp);
};

/** The migration changes recorded for `steps`: one per peer that ran a step from the step's heads. */
const migrationChanges = (
  doc: AutomergeDoc<unknown>,
  steps: readonly Migration.RecordedMigrationStep[],
): A.ChangeMetadata[] => {
  const all = A.getChangesMetaSince(doc, []);
  return steps.flatMap(({ step }) => {
    const message = `migration: ${step.from} -> ${step.to}`;
    const preHeads = [...step.preHeads].sort().join();
    return all.filter((change) => change.message === message && [...change.deps].sort().join() === preHeads);
  });
};

/** `from` and every change that depends on it. */
const descendantsOf = (changes: readonly A.ChangeMetadata[], from: string): Set<string> => {
  const found = new Set([from]);
  for (const change of changes) {
    if (change.deps.some((dep) => found.has(dep))) {
      found.add(change.hash);
    }
  }
  return found;
};

/**
 * Replays each user edit made inside a losing migration's container at a target property onto the
 * visible container there, as a change of its own: the edit the change made to the loser's value, placed
 * on the winner's value at a fork of the winning migration plus the replays of the edit's ancestors, so
 * every peer authors it identically. A container replaced by anything other than a migration is left
 * alone, as a direct replacement drops concurrent edits inside the value it replaced.
 */
export const replayLosingMigrations = (
  object: Obj.Unknown,
  steps: readonly Migration.RecordedMigrationStep[],
): void => {
  const core = getObjectCore(object);
  const dataPath = [...core.mountPath, DATA_NAMESPACE];
  const migrations = migrationChanges(core.getDoc(), steps);
  if (migrations.length < 2) {
    return;
  }

  const changes = A.getChangesMetaSince(core.getDoc(), []);
  const graph: ChangeGraph = new Map(changes.map((change) => [change.hash, change.deps]));
  const data: unknown = getDeep(core.getDoc(), dataPath);
  if (!isRecord(data)) {
    return;
  }

  for (const key of Object.keys(data)) {
    const conflicts = A.getConflicts(data, key);
    const visible = A.getObjectId(data, key);
    if (!conflicts || Object.keys(conflicts).length < 2 || !visible) {
      continue;
    }
    const winner = changeOfOp(migrations, visible);
    if (!winner) {
      continue;
    }
    for (const container of Object.keys(conflicts)) {
      const loser = changeOfOp(migrations, container);
      if (loser && loser.hash !== winner.hash) {
        replayContainer(object, key, winner, loser, changes, graph);
      }
    }
  }
};

/** Replays the user edits made inside `loser`'s container at `key` onto `winner`'s. */
const replayContainer = (
  object: Obj.Unknown,
  key: string,
  winner: A.ChangeMetadata,
  loser: A.ChangeMetadata,
  changes: readonly A.ChangeMetadata[],
  graph: ChangeGraph,
): void => {
  const core = getObjectCore(object);
  const dataPath = [...core.mountPath, DATA_NAMESPACE];
  const prefix = replayPrefix(object.id, key, winner.hash);
  const replayOf = new Map<string, string>();
  for (const change of changes) {
    if (change.message?.startsWith(prefix)) {
      replayOf.set(change.message.slice(prefix.length), change.hash);
    }
  }

  // Edits the loser's peer made before it received the winner, which are the only ones inside its container.
  const afterWinner = descendantsOf(changes, winner.hash);
  const candidates = [...descendantsOf(changes, loser.hash)].filter(
    (hash) => hash !== loser.hash && !afterWinner.has(hash),
  );
  for (const edit of changes.filter((change) => candidates.includes(change.hash))) {
    if (edit.message !== null && RUNNER_MESSAGE.test(edit.message)) {
      continue;
    }
    // Without the winner in its history, an edit to the property is an edit inside the loser's container.
    const keyPath = [...dataPath, key];
    const touched = A.diff(core.getDoc(), [...edit.deps], [edit.hash]).some(
      (patch) => patch.action !== 'conflict' && keyPath.every((segment, index) => patch.path[index] === segment),
    );
    if (!touched) {
      continue;
    }
    const previous: unknown = getDeep(A.view(core.getDoc(), [...edit.deps]), keyPath);
    const next: unknown = getDeep(A.view(core.getDoc(), [edit.hash]), keyPath);
    if (encodedValuesEqual(previous, next) || replayOf.has(edit.hash)) {
      continue;
    }

    const ancestors = ancestorsOf(graph, edit.deps);
    const fork: Heads = frontierOf(graph, [
      winner.hash,
      ...[...replayOf].filter(([replayed]) => ancestors.has(replayed)).map(([, replay]) => replay),
    ]);
    const current: unknown = getDeep(A.view(core.getDoc(), fork), [...dataPath, key]);
    try {
      const heads = core.sharedChangeAt(
        fork,
        (draft, mountPath) => applyStructuralEdit(draft, [...mountPath, DATA_NAMESPACE, key], previous, next, current),
        {
          message: `${prefix}${edit.hash}`,
          actorSeed: JSON.stringify({ object: object.id, key, winner: winner.hash, edit: edit.hash, fork }),
        },
      );
      if (heads) {
        const [replay] = heads;
        graph.set(replay, fork);
        replayOf.set(edit.hash, replay);
      }
    } catch (err) {
      log.warn('foldForward: could not replay an edit onto the winning migration', { object: object.id, key, err });
    }
  }
};
