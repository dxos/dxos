//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as SqliteClient from '@effect/sql-sqlite-wasm/SqliteClient';
import type * as ConfigError from 'effect/ConfigError';
import type * as Layer from 'effect/Layer';

export const layerMemory: Layer.Layer<SqlClient.SqlClient, ConfigError.ConfigError | SqlError.SqlError> =
  SqliteClient.layerMemory({});
