//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';

import { ClientService, layer as clientLayer } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import { ConfigService, configPreset } from '@dxos/config';
import { Database, Feed } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { Message } from '@dxos/types';

import { type SpaceSnapshot } from '../checks/index.ts';
import { CanaryError } from '../errors.ts';
import { readSnapshot } from './snapshot.ts';

/** The types the snapshot queries; a fresh client knows none of them. */
const TYPES = [Mailbox.Mailbox, Message.Message, Trace.Message, Trigger.Trigger, Feed.Feed];

// Bounds `syncToEdge`'s wait for the space's documents to match EDGE.
const SYNC_TIMEOUT_MS = 300_000;

/** An in-memory client against preview EDGE, destroyed when the scope closes. */
export const previewClientLayer = clientLayer.pipe(
  Layer.provide(Layer.succeed(ConfigService, configPreset({ edge: 'preview' }))),
);

export type CanarySpaceOptions = {
  readonly spaceId: string;
  readonly recoveryPhrase: string;
};

/**
 * The canary space, read through an in-process client signed in to the canary identity. Each sign-in
 * admits this process as a new device of the identity.
 */
export class CanarySpace {
  readonly spaceId: string;
  readonly #space: Space;

  private constructor(space: Space) {
    this.spaceId = space.id;
    this.#space = space;
  }

  /** Recovers the canary identity and waits until its space has replicated. */
  static open = Effect.fn('mail-canary.CanarySpace.open')(function* ({ spaceId, recoveryPhrase }: CanarySpaceOptions) {
    if (!SpaceId.isValid(spaceId)) {
      return yield* new CanaryError({ message: `not a space id: ${spaceId}` });
    }
    const client = yield* ClientService;
    yield* Effect.promise(() => client.addTypes(TYPES));
    yield* Effect.tryPromise({
      try: () => client.halo.recoverIdentity({ recoveryCode: recoveryPhrase }),
      // The cause can carry the phrase, so it is not passed on.
      catch: () => new CanaryError({ message: 'cannot recover the canary identity' }),
    });
    // The identity's spaces arrive over HALO after recovery, not with it.
    const space = yield* Effect.suspend(() => {
      const space = client.spaces.get(spaceId);
      return space ? Effect.succeed(space) : new CanaryError({ message: `space ${spaceId} never appeared` });
    }).pipe(Effect.retry({ schedule: Schedule.spaced('1 second'), times: 120 }));
    yield* Effect.tryPromise({
      try: () => space.waitUntilReady(),
      catch: (cause) => new CanaryError({ message: `space ${spaceId} is not ready: ${String(cause)}` }),
    });
    // Replication with EDGE is a per-device preference, off on a newly admitted device.
    if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
      yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
    }
    return new CanarySpace(space);
  });

  /**
   * Waits until the space's documents match EDGE, then reads the snapshot the checks run on. `syncToEdge`
   * covers documents only; `readSnapshot` pulls the feeds itself.
   */
  snapshot(): Effect.Effect<SpaceSnapshot, CanaryError> {
    return Effect.gen({ self: this }, function* () {
      yield* Effect.tryPromise({
        try: () => this.#space.internal.syncToEdge({ timeout: SYNC_TIMEOUT_MS, onProgress: () => {} }),
        catch: (cause) => new CanaryError({ message: `space did not sync with EDGE: ${String(cause)}` }),
      }).pipe(Effect.retry({ times: 2 }));
      return yield* readSnapshot().pipe(Effect.provide(Database.layer(this.#space.db)));
    });
  }
}
