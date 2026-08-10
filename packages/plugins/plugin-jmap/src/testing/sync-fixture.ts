//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type * as Capability from '@dxos/app-framework/Capability';
import type * as Operation from '@dxos/compute/Operation';
import type * as Trace from '@dxos/compute/Trace';
import { type Database } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver } from '@dxos/extractor';
import { MailSyncError, type RunMailSyncOptions, runMailSync } from '@dxos/plugin-inbox/sync';
import { ambientSyncServices } from '@dxos/plugin-inbox/testing/sync';

import { jmapMailSyncProvider } from '../operations/mail/sync/sync-provider';
import { type JmapDataset, JmapMailApi } from '../services';

/**
 * Test entry point for the JMAP sync — `runMailSync` with this provider's layer, leaving the API for the
 * test to supply (mock or Live). Production inlines the same wiring in the sync handler.
 */
export const runJmapSync = (
  options: RunMailSyncOptions,
): Effect.Effect<
  { newMessages: number },
  MailSyncError | EntityNotFoundError,
  Database.Service | Capability.Service | Operation.Service | Trace.TraceService | JmapMailApi | Resolver
> => runMailSync(options).pipe(Effect.provide(jmapMailSyncProvider()), Effect.withSpan('jmap-sync'));

/** The ambient services {@link runJmapSync} requires, backed by a mock JMAP API + a real db. */
export const jmapSyncTestServices = (
  db: Database.Database,
  dataset: JmapDataset,
  options?: { traceLayer?: Layer.Layer<Trace.TraceService> },
): Layer.Layer<
  JmapMailApi | Database.Service | Resolver | Capability.Service | Trace.TraceService | Operation.Service
> => Layer.mergeAll(JmapMailApi.mock(dataset), ambientSyncServices(db, options));
