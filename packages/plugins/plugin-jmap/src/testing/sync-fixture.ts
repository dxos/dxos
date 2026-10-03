//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type * as Capability from '@dxos/app-framework/Capability';
import type * as Operation from '@dxos/compute/Operation';
import type * as Trace from '@dxos/compute/Trace';
import { type Database, Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Error';
import { type Resolver } from '@dxos/extractor';
import { type Connection } from '@dxos/link';
import { type ConnectionAuthExpiredError } from '@dxos/plugin-connector';
import * as Binding from '@dxos/plugin-connector/Binding';
import { type MailSyncError, type RunMailSyncOptions, runMailSync } from '@dxos/plugin-inbox/sync';
import { ambientSyncServices } from '@dxos/plugin-inbox/testing/sync';

import { type JmapDataset, JmapMailApi } from '#services';

import { jmapMailSyncProvider } from '../operations/mail/sync/sync-provider.ts';

/**
 * Test entry point for the JMAP sync — the account-level fan-out over `runMailSync` with this
 * provider's layer, leaving the API for the test to supply (mock or Live). Production inlines the
 * same wiring in the sync handler.
 */
export const runJmapSync = ({
  connection,
  ...options
}: { connection: Ref.Ref<Connection.Connection> } & Omit<RunMailSyncOptions, 'binding'>): Effect.Effect<
  { newMessages: number },
  MailSyncError | EntityNotFoundError | ConnectionAuthExpiredError,
  Database.Service | Capability.Service | Operation.Service | Trace.TraceService | JmapMailApi | Resolver
> =>
  Binding.syncAll({
    connection,
    sync: (binding) =>
      runMailSync({ binding: Ref.make(binding), ...options }).pipe(
        Effect.provide(jmapMailSyncProvider()),
        Effect.withSpan('jmap-sync'),
      ),
  }).pipe(
    Effect.map(({ outputs }) => ({
      newMessages: outputs.reduce((total, output) => total + output.newMessages, 0),
    })),
  );

/** The ambient services {@link runJmapSync} requires, backed by a mock JMAP API + a real db. */
export const jmapSyncTestServices = (
  db: Database.Database,
  dataset: JmapDataset,
  options?: { traceLayer?: Layer.Layer<Trace.TraceService> },
): Layer.Layer<
  JmapMailApi | Database.Service | Resolver | Capability.Service | Trace.TraceService | Operation.Service
> => Layer.mergeAll(JmapMailApi.mock(dataset), ambientSyncServices(db, options));
