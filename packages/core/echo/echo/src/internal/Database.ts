//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';

// Type-only import (erased at runtime — no import cycle): the public `Database`
// module re-exports the tag declared here, so internal consumers can depend on
// the service identity without importing the top-level API at runtime.
import type * as Database from '../Database';

/**
 * Effect service tag for Database dependency injection.
 *
 * Declared in `internal` (rather than the top-level `Database` module) so
 * internal consumers — e.g. the `Ref` reference resolver — can require the
 * service at runtime without importing the public API. The service shape is
 * typed against the public `Database` interface via a type-only import, so no
 * runtime cycle is introduced. The top-level `Database` module re-exports this
 * as `Database.Service`, preserving the tag's identity for every call site.
 */
export class DatabaseService extends Context.Tag('@dxos/echo/Database/Service')<
  DatabaseService,
  {
    readonly db: Database.Database;
  }
>() {}
