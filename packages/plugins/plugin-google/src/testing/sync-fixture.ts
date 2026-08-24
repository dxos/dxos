//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import type * as Capability from '@dxos/app-framework/Capability';
import { credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import type * as Operation from '@dxos/compute/Operation';
import type * as Trace from '@dxos/compute/Trace';
import { Database, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Error';
import { type Resolver } from '@dxos/extractor';
import { Connection } from '@dxos/link';
import { MailSyncError, type RunMailSyncOptions, runMailSync } from '@dxos/plugin-inbox/sync';
import { ambientSyncServices } from '@dxos/plugin-inbox/testing/sync';

import { type GmailDataset, GoogleCredentials, GoogleMailApi } from '#services';

import { googleMailSyncProvider } from '../operations/mail/sync/sync-provider';

/**
 * Test entry point for the Gmail sync — `runMailSync` with the Gmail provider layer, leaving the API for
 * the test to supply (mock, counting, fault, or Live). Production inlines this in the handler.
 */
export const runGoogleSync = (
  options: RunMailSyncOptions,
): Effect.Effect<
  { newMessages: number },
  MailSyncError | EntityNotFoundError,
  Database.Service | Capability.Service | Operation.Service | Trace.TraceService | GoogleMailApi | Resolver
> =>
  runMailSync(options).pipe(
    Effect.provide(googleMailSyncProvider({ userId: 'me', label: 'all' })),
    Effect.withSpan('google-sync'),
  );

/** The ambient services {@link runGoogleSync} requires, backed by a mock Gmail API + a real db. */
export const googleSyncTestServices = (
  db: Database.Database,
  dataset: GmailDataset,
  options?: { traceLayer?: Layer.Layer<Trace.TraceService> },
): Layer.Layer<
  GoogleMailApi | Database.Service | Resolver | Capability.Service | Trace.TraceService | Operation.Service
> => Layer.mergeAll(GoogleMailApi.mock(dataset), ambientSyncServices(db, options));

/**
 * The ambient services {@link runGoogleSync} requires, backed by the REAL Gmail HTTP API authenticated
 * from the given connection's `AccessToken`. Used by the fixture-fetch tool to sync a real account
 * in-process (no EDGE / function deployment). The token must be a valid Gmail OAuth token.
 */
export const googleSyncLiveServices = (
  db: Database.Database,
  connectionRef: Ref.Ref<Connection.Connection>,
): Layer.Layer<
  GoogleMailApi | Database.Service | Resolver | Capability.Service | Trace.TraceService | Operation.Service,
  EntityNotFoundError
> => {
  // The fixture connection carries a real token on the object, so no credential resolves through EDGE.
  const credentials = credentialsLayerFromDatabase().pipe(
    Layer.provide(Database.layer(db)),
    Layer.provide(Credential.AccessTokenResolver.notAvailable),
  );
  return Layer.mergeAll(
    GoogleMailApi.Live.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(GoogleCredentials.fromConnection(connectionRef).pipe(Layer.provide(Database.layer(db)))),
      Layer.provide(credentials),
    ),
    ambientSyncServices(db),
  );
};
