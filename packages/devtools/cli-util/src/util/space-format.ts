//
// Copyright 2025 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { type Space, SpaceState, type SpaceSyncState } from '@dxos/client/echo';

import * as FormBuilder from './form-builder';

export type FormatSpaceOptions = {
  verbose?: boolean;
  truncateKeys?: boolean;
  /**
   * If set, wait up to this many seconds for the space to reach
   * `SPACE_READY` before reading its fields. If unset, read whatever state
   * is available right now — much safer for `space list` etc., where a
   * single stuck space would otherwise hang the entire command.
   */
  waitSeconds?: number;
};

const DEFAULT_OPTIONS: Required<FormatSpaceOptions> = {
  verbose: false,
  truncateKeys: false,
  waitSeconds: 0,
};

/**
 * Per-async-read internal timeout. Some `space.internal.*` getters do
 * filesystem / network IO and can themselves hang on a partially-loaded
 * space; cap each one so the command can never be held hostage by SDK
 * internals.
 */
const READ_TIMEOUT_SECONDS = 2;

const tryWithFallback = <T>(label: string, run: () => Promise<T>, fallback: T) =>
  Effect.tryPromise(run).pipe(
    Effect.timeoutFail({
      duration: Duration.seconds(READ_TIMEOUT_SECONDS),
      onTimeout: () => new Error(`${label} timed out`),
    }),
    Effect.catchAll(() => Effect.succeed(fallback)),
  );

const tryWithFallbackSync = <T>(read: () => T, fallback: T): T => {
  try {
    return read();
  } catch {
    return fallback;
  }
};

// TODO(wittjosiah): Use @effect/printer.
export const formatSpace = Effect.fn(function* (space: Space, options: FormatSpaceOptions = {}) {
  const { waitSeconds } = { ...DEFAULT_OPTIONS, ...options };

  // Opt-in wait. Defaults to NO wait so a single stuck space can't hang
  // an enumeration command (e.g. `dx space list`).
  if (waitSeconds > 0) {
    yield* Effect.tryPromise(() => space.waitUntilReady()).pipe(
      Effect.timeoutFail({
        duration: Duration.seconds(waitSeconds),
        onTimeout: () => new Error('waitUntilReady timed out'),
      }),
      Effect.catchAll(() => Effect.void),
    );
  }

  const state = tryWithFallbackSync(() => space.state.get(), SpaceState.SPACE_INITIALIZING);
  const ready = state === SpaceState.SPACE_READY;

  // TODO(burdon): Factor out.
  // TODO(burdon): Agent needs to restart before `ready` is available.
  const metrics = tryWithFallbackSync(
    () => space.internal.data.metrics,
    undefined as { open?: Date; ready?: Date } | undefined,
  );
  const startup = metrics?.open && metrics?.ready ? metrics.ready.getTime() - metrics.open.getTime() : undefined;

  // TODO(burdon): Get feeds from client-services if verbose (factor out from devtools/diagnostics).
  // const host = client.services.services.DevtoolsHost!;
  const pipeline = tryWithFallbackSync(() => space.internal.data.pipeline, undefined);
  const epoch = pipeline?.currentEpoch?.subject.assertion.number;

  // The sync-state read does IO; cap it so a stuck space can't hang the
  // command. Falls back to a "no peers" placeholder.
  const syncStateRaw = yield* tryWithFallback('getSyncState', () => space.internal.db.coreDatabase.getSyncState(), {
    peers: {},
  } as SpaceSyncState);
  const syncState = aggregateSyncState(syncStateRaw);

  const name = ready ? tryWithFallbackSync(() => space.properties.name, undefined) : 'loading...';
  const members = tryWithFallbackSync(() => space.members.get().length, 0);
  const objects = tryWithFallbackSync(() => space.internal.db.coreDatabase.getAllObjectIds().length, 0);
  const key = options.truncateKeys
    ? tryWithFallbackSync(() => space.key.truncate(), '')
    : tryWithFallbackSync(() => space.key.toHex(), '');

  return {
    id: space.id,
    state: SpaceState[state],
    name,

    members,
    objects,

    key,
    epoch,
    startup,
    automergeRoot: pipeline?.spaceRootUrl,
    // appliedEpoch,
    syncState: `${syncState.count} ${getSyncIndicator(syncState.up, syncState.down)} (${syncState.peers} peers)`,
  };
});

const aggregateSyncState = (syncState: SpaceSyncState) => {
  const peers = Object.keys(syncState.peers ?? {}).length;
  const missingOnLocal = Math.max(...Object.values(syncState.peers ?? {}).map((peer) => peer.missingOnLocal), 0);
  const missingOnRemote = Math.max(...Object.values(syncState.peers ?? {}).map((peer) => peer.missingOnRemote), 0);
  const differentDocuments = Math.max(
    ...Object.values(syncState.peers ?? {}).map((peer) => peer.differentDocuments),
    0,
  );

  return {
    count: missingOnLocal + missingOnRemote + differentDocuments,
    peers,
    up: missingOnRemote > 0 || differentDocuments > 0,
    down: missingOnLocal > 0 || differentDocuments > 0,
  };
};

const getSyncIndicator = (up: boolean, down: boolean) => {
  if (up) {
    if (down) {
      return '⇅';
    } else {
      return '↑';
    }
  } else {
    if (down) {
      return '↓';
    } else {
      return '✓';
    }
  }
};

export type FormattedSpace = {
  id: string;
  state: string;
  name: string | undefined;
  members: number;
  objects: number;
  key: string;
  epoch: any;
  startup: number | undefined;
  automergeRoot: string | undefined;
  syncState: string;
};

/**
 * Pretty prints a space with ANSI colors.
 */
export const printSpace = (spaceData: FormattedSpace) =>
  FormBuilder.make({ title: spaceData.name ?? spaceData.id }).pipe(
    FormBuilder.set('id', spaceData.id),
    FormBuilder.set('state', spaceData.state),
    FormBuilder.set('key', spaceData.key),
    FormBuilder.set('members', spaceData.members),
    FormBuilder.set('objects', spaceData.objects),
    FormBuilder.set('epoch', spaceData.epoch ?? '<none>'),
    FormBuilder.set('startup', spaceData.startup ? `${spaceData.startup}ms` : '<none>'),
    FormBuilder.set('syncState', spaceData.syncState),
    FormBuilder.set('automergeRoot', spaceData.automergeRoot ?? '<none>'),
    FormBuilder.build,
  );
