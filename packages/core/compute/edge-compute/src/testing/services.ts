//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';

import type { Space } from '@dxos/client/echo';
import { type Credential, type Trace } from '@dxos/compute';
import { ConfiguredCredentialsService } from '@dxos/compute-runtime';
import { ServiceContainer } from '@dxos/compute-runtime';
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
 * @deprecated
 */
export const createTestServices = ({
  ai,
  credentials,
  db,
  logging,
  space,
}: TestServiceOptions = {}): ServiceContainer => {
  assertArgument(!(!!space && !!db), 'space', 'space can be provided only if db is not');

  return new ServiceContainer().setServices({
    // ai: createAiService(ai),
    credentials: createCredentialsService(credentials),
    database: space || db ? Database.makeService(space?.db || db!) : undefined,
    trace: logging?.trace ?? (logging?.enabled ? consoleTraceWriter : noopTraceWriter),
  });
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
