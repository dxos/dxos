//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import type { EchoDatabase } from '@dxos/echo-db';

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    readonly db: EchoDatabase;
  }
>() {
  static notAvailable = Layer.succeed(DatabaseService, {
    get db(): EchoDatabase {
      throw new Error('Database not available');
    },
  });

  static make = (db: EchoDatabase): Context.Tag.Service<DatabaseService> => {
    return {
      get db() {
        return db;
      },
    };
  };
}
