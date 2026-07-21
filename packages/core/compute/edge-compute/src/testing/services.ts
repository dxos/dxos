//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

import type { Space } from '@dxos/client/echo';
import { Credential, Trace } from '@dxos/compute';
import { ConfiguredCredentialsService } from '@dxos/compute-runtime';
import { Database } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { assertArgument } from '@dxos/invariant';

import { consoleTraceWriter, noopTraceWriter } from './logger';

// TODO(burdon): Factor out.
export type OneOf<T> = {
  [K in keyof T]: { [P in K]: T[P] } & { [P in Exclude<keyof T, K>]?: never };
}[keyof T];

export type AiServiceProvider = 'dev' | 'edge' | 'ollama' | 'lmstudio';

export type TestServiceOptions = {
  /**
   * AI service configuration.
   */
  ai?: any;

  /**
   * Credentials service configuration.
   */
  credentials?: OneOf<{
    /**
     * Predefined credentials list.
     */
    services?: Credential.ServiceCredential[];

    /**
     * Custom credentials service.
     */
    service?: Context.Tag.Service<Credential.CredentialsService>;
  }>;

  /**
   * Database configuration.
   */
  db?: EchoDatabase;

  /**
   * Gets database service from the space.
   * Exclusive with: `db`
   */
  space?: Space;

  /**
   * Trace writer configuration.
   */
  logging?: {
    enabled?: boolean;
    trace?: Context.Tag.Service<Trace.TraceService>;
  };
};

/**
 * Composes the foundational Effect layers available to compute nodes and operations in tests:
 * credentials, database (from a space or standalone database), and trace. Callers layer AI,
 * `Operation.Service`, and registry on top as needed for the code under test.
 */
export const createTestServices = ({ credentials, db, logging, space }: TestServiceOptions = {}): Layer.Layer<
  Credential.CredentialsService | Database.Service | Trace.TraceService
> => {
  assertArgument(!(!!space && !!db), 'space', 'space can be provided only if db is not');

  const credentialsLayer = Layer.succeed(
    Credential.CredentialsService,
    createCredentialsService(credentials) ?? new ConfiguredCredentialsService(),
  );

  const database = space?.db ?? db;
  const databaseLayer = database ? Database.layer(database) : Database.notAvailable;

  const traceLayer = Layer.succeed(
    Trace.TraceService,
    logging?.trace ?? (logging?.enabled ? consoleTraceWriter : noopTraceWriter),
  );

  return Layer.mergeAll(credentialsLayer, databaseLayer, traceLayer);
};

const createCredentialsService = (
  credentials: TestServiceOptions['credentials'] | undefined,
): Context.Tag.Service<Credential.CredentialsService> | undefined => {
  if (credentials?.services) {
    return new ConfiguredCredentialsService(credentials.services);
  }

  if (credentials?.service) {
    return credentials.service;
  }
};
