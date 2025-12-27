//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import type { Entity, Type } from '@dxos/echo';
import { getSchemaDXN } from '@dxos/echo/internal';
import { type DXN } from '@dxos/keys';

import type { AnyLiveObject } from '../echo-handler';

import type { EchoDatabase } from './database';

type DefineObjectMigrationOptions<From extends Schema.Schema.AnyNoContext, To extends Schema.Schema.AnyNoContext> = {
  from: From;
  to: To;
  /**
   * Pure function that converts the old object data to the new object data.
   */
  // TODO(dmaretskyi): `id` should not be a part of the schema.
  transform: (
    from: Schema.Schema.Type<From>,
    context: ObjectMigrationContext,
  ) => Promise<Omit<Schema.Schema.Type<To>, 'id' | Entity.KindId>>;

  /**
   * Callback that is called after the object is migrated. Called for every object that is migrated.
   *
   * NOTE: Database mutations performed in this callback are not guaranteed to be idempotent.
   *       If multiple peers run the migration separately, the effects may be applied multiple times.
   */
  onMigration: (params: OnMigrateProps<From, To>) => Promise<void>;
};

// TODO(dmaretskyi): For future extensibility.
type ObjectMigrationContext = {};

type OnMigrateProps<From extends Schema.Schema.AnyNoContext, To extends Schema.Schema.AnyNoContext> = {
  before: Schema.Schema.Type<From>;
  object: AnyLiveObject<Schema.Schema.Type<To>>;
  db: EchoDatabase;
};

export type ObjectMigration = {
  fromType: DXN;
  toType: DXN;
  fromSchema: Schema.Schema.AnyNoContext;
  toSchema: Schema.Schema.AnyNoContext;
  transform: (from: unknown, context: ObjectMigrationContext) => Promise<unknown>;
  onMigration: (params: OnMigrateProps<any, any>) => Promise<void>;
};

export const defineObjectMigration = <From extends Schema.Schema.AnyNoContext, To extends Schema.Schema.AnyNoContext>(
  options: DefineObjectMigrationOptions<From, To>,
): ObjectMigration => {
  const fromType = getSchemaDXN(options.from);
  if (!fromType) {
    throw new Error('Invalid from schema');
  }
  const toType = getSchemaDXN(options.to);
  if (!toType) {
    throw new Error('Invalid to schema');
  }

  return {
    fromType,
    toType,
    fromSchema: options.from,
    toSchema: options.to,
    transform: options.transform as any,
    onMigration: options.onMigration as any,
  };
};
