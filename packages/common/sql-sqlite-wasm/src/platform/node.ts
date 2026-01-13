import * as SqlClient from '@effect/sql/SqlClient';
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Layer from 'effect/Layer';
import type { ConfigError } from 'effect/ConfigError';
import type { SqlError } from '@effect/sql/SqlError';

export const layerMemory: Layer.Layer<SqlClient.SqlClient, ConfigError | SqlError> = SqliteClient.layer({
  filename: ':memory:',
});
