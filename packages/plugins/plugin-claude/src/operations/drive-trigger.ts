//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Ref } from '@dxos/echo';

import { CloudRunOperation } from '#types';

/** How often the space's drive trigger fires; every cloud run is advanced once per tick. */
export const DRIVE_CRON = '*/5 * * * *';

const byId = (left: { id: string }, right: { id: string }): number =>
  left.id < right.id ? -1 : left.id > right.id ? 1 : 0;

const isDriveTrigger = (trigger: Trigger.Trigger): boolean =>
  trigger.runnable?.uri === CloudRunOperation.DriveCloudRuns.meta.key.toString();

/**
 * Gives the space its one drive trigger, unless it has one already (a disabled one stays disabled). Peers that race
 * each add their own, so every caller keeps the lowest id and removes the rest. It runs on EDGE, so runs advance
 * while no client has the space open.
 */
export const ensureDriveTrigger = Effect.fnUntraced(function* () {
  const triggers = yield* Database.query(Filter.type(Trigger.Trigger)).run;
  const [keeper, ...duplicates] = triggers.filter(isDriveTrigger).sort(byId);
  for (const duplicate of duplicates) {
    yield* Database.remove(duplicate);
  }
  if (keeper) {
    return keeper;
  }
  return yield* Database.add(
    Trigger.make({
      enabled: true,
      remote: true,
      spec: Trigger.specTimer(DRIVE_CRON),
      // Statically defined in the registry, so referred to by key rather than copied into the space.
      runnable: Ref.fromURI(CloudRunOperation.DriveCloudRuns.meta.key),
      input: {},
    }),
  );
});
