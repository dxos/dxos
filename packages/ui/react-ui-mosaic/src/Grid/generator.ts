//
// Copyright 2025 DXOS.org
//

import { type Database } from '@dxos/echo';
import { faker } from '@dxos/random';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';

const generator = faker as any as ValueGenerator;

export const factory = (db: Database.Database) => {
  return createObjectFactory(db, generator);
};
