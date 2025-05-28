import type { EchoDatabase } from '@dxos/echo-db';
import { Context } from 'effect';

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    readonly db: EchoDatabase;
  }
>() {}
