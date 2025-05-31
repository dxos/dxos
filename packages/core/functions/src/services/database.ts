//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import type { EchoDatabase } from '@dxos/echo-db';

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    readonly db: EchoDatabase;
  }
>() {}
