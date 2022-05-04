//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import faker from 'faker';

import { createKeyPair } from '@dxos/crypto';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManagerOptions } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { IStorage } from '@dxos/random-access-multi-storage';
import { jsonReplacer } from '@dxos/util';

import { Database, Schema, SchemaDef, SchemaField, TYPE_SCHEMA } from '../api';
import { createInMemoryDatabase } from '../database';
import { ECHO } from '../echo';
import { PartyInternal } from '../parties';
import { createRamStorage } from '../util';

export const log = debug('dxos:echo-db:testing');

export const messageLogger = (tag: string) => (message: any) => {
  log(tag, JSON.stringify(message, jsonReplacer, 2));
};

export interface TestOptions {
  verboseLogging?: boolean
  initialize?: boolean
  storage?: any
  keyStorage?: any
  networkManagerOptions?: NetworkManagerOptions
  // TODO(burdon): Group properties by hierarchical object.
  snapshots?: boolean
  snapshotInterval?: number
  snapshotStorage?: IStorage
}

/**
 * Creates ECHO instance for testing.
 */
export const createTestInstance = async ({
  verboseLogging = false,
  initialize = false,
  storage = createRamStorage(),
  keyStorage = undefined,
  networkManagerOptions,
  snapshotStorage = createRamStorage(),
  snapshots = true,
  snapshotInterval
}: TestOptions = {}) => {
  const echo = new ECHO({
    feedStorage: storage,
    keyStorage,
    snapshotStorage,
    snapshotInterval,
    snapshots,
    networkManagerOptions,
    readLogger: verboseLogging ? messageLogger('>>>') : undefined,
    writeLogger: verboseLogging ? messageLogger('<<<') : undefined
  });

  if (initialize) {
    await echo.open();
    if (!echo.halo.identityKey) {
      await echo.halo.createIdentity(createKeyPair());
    }
    if (!echo.halo.isInitialized) {
      await echo.halo.create();
    }
  }

  return echo;
};

/**
 * Invites a test peer to the party.
 * @returns Party instance on provided test instance.
 */
export const inviteTestPeer = async (party: PartyInternal, peer: ECHO): Promise<PartyInternal> => {
  const invitation = await party.invitationManager.createInvitation({
    secretValidator: async () => true
  });

  return peer.joinParty(invitation, async () => Buffer.from('0000'));
};

export type SchemaFieldWithGenerator = SchemaField & { generator: () => string }
export type SchemaDefWithGenerator = Omit<SchemaDef, 'fields'> & { fields: SchemaFieldWithGenerator[] };

type Callback = (party: Database) => Promise<void>

export const setup = async (callback: Callback) => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createInMemoryDatabase(modelFactory);
  try {
    await callback(database);
  } finally {
    await database.destroy();
  }
};

/**
 * Create schema items.
 */
export const createSchemas = async (database: Database, schemas: SchemaDefWithGenerator[]) => {
  log(`Creating schemas: [${schemas.map(({ schema }) => schema).join()}]`);

  const schemaItems = await Promise.all(schemas.map(({ schema, fields }) => {
    const schemaFields = fields.map(fieldWithGenerator => {
      // eslint-disable-next-line unused-imports/no-unused-vars
      const { generator, ...field } = fieldWithGenerator;
      return field;
    }).flat();

    return database.createItem({
      model: ObjectModel,
      type: TYPE_SCHEMA,
      props: {
        schema,
        fields: schemaFields
      }
    });
  }));

  return schemaItems.map(item => new Schema(item.model));
};

/**
 * Create items for a given schema.
 * NOTE: Assumes that referenced items have already been constructed.
 */
export const createItems = async (database: Database, { schema, fields }: SchemaDefWithGenerator, numItems: number) => {
  log(`Creating items for: ${schema}`);

  return await Promise.all(Array.from({ length: numItems }).map(async () => {
    const values = fields.map(field => {
      if (field.ref) {
        // Look-up item.
        const { entities: items } = database.select().filter({ type: field.ref.schema }).exec();
        if (items.length) {
          return {
            [field.key]: faker.random.arrayElement(items).id
          };
        }
      } else {
        return {
          [field.key]: field.generator()
        };
      }

      return undefined;
    }).filter(Boolean);

    return await database.createItem({
      type: schema,
      props: Object.assign({}, ...values)
    });
  }));
};

/**
 * Create data for all schemas.
 */
export const createData = async (database: Database, schemas: SchemaDefWithGenerator[], options: { [key: string]: number } = {}) => {
  // Synchronous loop.
  for (const schema of schemas) {
    const count = options[schema.schema] ?? 0;
    if (count) {
      await createItems(database, schema, count);
    }
  }
};
