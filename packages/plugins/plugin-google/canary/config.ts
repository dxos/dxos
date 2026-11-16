//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import { SpaceId } from '@dxos/keys';

import { type EdgeWaits } from './space.ts';

const CanaryConfig = Schema.Struct({
  spaceId: SpaceId,
  runTimeoutMinutes: Schema.Number,
  seed: Schema.Struct({ count: Schema.Int }),
  monitor: Schema.Struct({
    timeoutMinutes: Schema.Number,
    pollSeconds: Schema.Number,
    windowHours: Schema.Number,
    hungMinutes: Schema.Number,
  }),
  fullSync: Schema.Struct({
    enabled: Schema.Boolean,
    days: Schema.Int,
    timeoutMinutes: Schema.Number,
    pollSeconds: Schema.Number,
    tokenRefreshMinutes: Schema.Number,
  }),
  edge: Schema.Struct({
    openMinutes: Schema.Number,
    readMinutes: Schema.Number,
    triggerMinutes: Schema.Number,
    deleteMinutes: Schema.Number,
  }),
});

export type CanaryConfig = Schema.Schema.Type<typeof CanaryConfig>;

/** Every setting of the canary, from `canary.yml`. */
export const loadConfig = (): CanaryConfig =>
  Schema.decodeUnknownSync(CanaryConfig)(parse(readFileSync(join(import.meta.dirname, 'canary.yml'), 'utf8')));

/** The `edge.*` bounds as durations. */
export const edgeWaits = ({ edge }: CanaryConfig): EdgeWaits => ({
  open: Duration.minutes(edge.openMinutes),
  read: Duration.minutes(edge.readMinutes),
  trigger: Duration.minutes(edge.triggerMinutes),
  delete: Duration.minutes(edge.deleteMinutes),
});
