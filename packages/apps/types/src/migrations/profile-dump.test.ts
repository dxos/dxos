//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import fs, { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pkgUp from 'pkg-up';

import { asyncTimeout } from '@dxos/async';
import { Client, Config, PublicKey } from '@dxos/client';
import { type SpaceId, SpaceState, getTypename, loadObjectReferences, type Space } from '@dxos/client/echo';
import { createLevel, createStorageObjects, decodeProfileArchive, importProfileData } from '@dxos/client-services';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { Migrations } from '@dxos/migrations';
import type { Runtime } from '@dxos/protocols/proto/dxos/config';
import { afterTest, describe, test } from '@dxos/test';

import * as LegacyTypes from './legacy-types';
import { __COMPOSER_MIGRATIONS__ } from './migrations';
import {
  CollectionType,
  DiagramType,
  DocumentType,
  FileType,
  MessageType,
  TableType,
  TextType,
  ThreadType,
} from '../schema';

const DATA_DIR = 'data';

const getPackageDir = () => path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('No package.json found')));

const getBaseDataDir = () => {
  const packageDirname = getPackageDir();
  const storageDir = path.join(packageDirname, DATA_DIR);
  fs.mkdirSync(storageDir, { recursive: true });
  return storageDir;
};

const extractDumpToTmp = async (file: string, storageConfig: Runtime.Client.Storage) => {
  const data = await readFile(file);
  const archive = decodeProfileArchive(data);
  log.info('importing archive', { entries: archive.storage.length });
  const { storage } = createStorageObjects(storageConfig);
  const level = await createLevel(storageConfig);
  log.info('begin profile import', { storageConfig });
  await importProfileData({ storage, level }, archive);
  await level.close();
  await storage.close();
  log.info('done profile import');
};

const waitForState = async (space: Space, states: SpaceState[]) => {
  await new Promise<void>((resolve) => {
    space.state.subscribe((state) => {
      console.log({ id: space.id, state });
      if (states.includes(state)) {
        resolve();
      }
    });
  });
};

type SpacesDump = {
  /**
   * SpaceIds mapped to JSON dump of all objects in the space.
   */
  [spaceId: string]: {
    /**
     * ObjectIds mapped to JSON dump of the object.
     */
    [objectId: string]: any;
  };
};

describe('Run migrations on profile dump', () => {
  test(__COMPOSER_MIGRATIONS__[1].version, async () => {
    const dataRoot = path.join('/', 'tmp', `proto-guard-${PublicKey.random().toHex()}`);
    afterTest(() => rmSync(dataRoot, { recursive: true }));
    const config = new Config({
      version: 1,
      runtime: { client: { storage: { persistent: true, dataRoot } } },
    });
    const filePath = path.join(getBaseDataDir(), `${__COMPOSER_MIGRATIONS__[1].version}.dxprofile`);
    await extractDumpToTmp(filePath, config.values.runtime!.client!.storage!);
    const client = new Client({ config });
    await asyncTimeout(client.initialize(), 2_000);
    afterTest(() => client.destroy());

    log.break();

    await client.spaces.isReady.wait();

    log.info('Running protocols migrations');

    const expectedObjectCounts: { [spaceId: string]: number } = {
      BHIUIBPIJMDRHO6SMVTYONDBFP5HDSSGP: 210, // Meeting Notes
      BUUBH5QN42RKHZCR5ZHVNWGK6BSDHSPZ2: 671, // Protocols
      B733M6EKJ2VFZJRLX4Y5WH4Y5PDBH6BAK: 307, // Design Review
    };
    const spaceIds = Object.keys(expectedObjectCounts);
    const spaces = client.spaces.get().filter((space) => spaceIds.includes(space.id));
    for (const space of spaces) {
      if (space.state.get() !== SpaceState.SPACE_INACTIVE) {
        await waitForState(space, [SpaceState.SPACE_READY, SpaceState.SPACE_REQUIRES_MIGRATION]);
      }

      if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
        log.info('migrating space', { id: space.id });
        await space.internal.migrate();
        await waitForState(space, [SpaceState.SPACE_READY]);
        log.info('migrated space', { id: space.id, name: space.properties.name });
      }
    }

    log.info('Preparing for composer migrations');

    Migrations.define('composer', __COMPOSER_MIGRATIONS__);

    const spacesDump: SpacesDump = {};
    for (const space of spaces) {
      const { objects } = await space.db.query().run({ timeout: 30_000 });
      expect(objects.length).to.eq(expectedObjectCounts[space.id]); // Increase timeout if the check fails.
      log.info('objects before composer migrations', { objects: objects.length });

      spacesDump[space.id] = {};
      for (const object of objects) {
        spacesDump[space.id][object.id] = {
          typename: getTypename(object),
          data: JSON.parse(JSON.stringify(object)),
        };
      }
    }

    log.info('Running composer migrations');

    for (const space of spaces) {
      log.info('Migrating space', { id: space.id, name: space.properties.name });
      await Migrations.migrate(space, __COMPOSER_MIGRATIONS__[1].version);
    }

    log.info('Checking composer migrations');

    let total = 0;
    let succeeded = 0;
    const failed: Record<string, number> = {};
    for (const [spaceId, objects] of Object.entries(spacesDump)) {
      for (const [objectId, object] of Object.entries(objects)) {
        total++;
        const space = client.spaces.get(spaceId as SpaceId);
        const migratedObject = space?.db.getObjectById(objectId);

        const { typename, data } = object;
        if (typename === LegacyTypes.SectionType.typename) {
          if (migratedObject) {
            log.info('failed section', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
            failed[LegacyTypes.SectionType.typename] = (failed[LegacyTypes.SectionType.typename] ?? 0) + 1;
          } else {
            succeeded++;
          }
          continue;
        }

        if (!migratedObject) {
          log.info('missing object', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
          failed[typename] = (failed[typename] ?? 0) + 1;
          continue;
        }
        switch (typename) {
          case LegacyTypes.FolderType.typename:
            if (getTypename(migratedObject) !== CollectionType.typename) {
              log.info('failed folder', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
              failed[LegacyTypes.FolderType.typename] = (failed[LegacyTypes.FolderType.typename] ?? 0) + 1;
              continue;
            }
            expect(getTypename(migratedObject)).to.equal(CollectionType.typename);
            expect(data.name ?? data.title).to.equal(migratedObject.name);
            expect(data.objects.length).to.equal(migratedObject.objects.length);
            break;

          case LegacyTypes.StackType.typename:
            if (getTypename(migratedObject) !== CollectionType.typename) {
              log.info('failed stack', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
              failed[LegacyTypes.StackType.typename] = (failed[LegacyTypes.StackType.typename] ?? 0) + 1;
              continue;
            }
            expect(getTypename(migratedObject)).to.equal(CollectionType.typename);
            expect(data.title).to.equal(migratedObject.name);
            expect(data.sections.length).to.equal(migratedObject.objects.length);
            break;

          case LegacyTypes.DocumentType.typename: {
            if (getTypename(migratedObject) !== DocumentType.typename) {
              log.info('failed document', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
              failed[LegacyTypes.DocumentType.typename] = (failed[LegacyTypes.DocumentType.typename] ?? 0) + 1;
              continue;
            }
            expect(getTypename(migratedObject)).to.equal(DocumentType.typename);
            expect(data.title).to.equal(migratedObject.name);
            const content = await loadObjectReferences(migratedObject, (doc) => doc.content);
            expect(getTypename(content)).to.equal(TextType.typename);
            break;
          }

          case LegacyTypes.ThreadType.typename: {
            if (getTypename(migratedObject) !== ThreadType.typename) {
              log.info('failed thread', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
              failed[LegacyTypes.ThreadType.typename] = (failed[LegacyTypes.ThreadType.typename] ?? 0) + 1;
              continue;
            }
            expect(getTypename(migratedObject)).to.equal(ThreadType.typename);
            expect(data.title).to.equal(migratedObject.name);
            expect(data.messages.length).to.equal(migratedObject.messages.length);
            const messages = await loadObjectReferences(migratedObject, (thread) => thread.messages);
            messages.forEach((message: any) => {
              expect(getTypename(message)).to.equal(MessageType.typename);
            });
            break;
          }

          case LegacyTypes.SketchType.typename:
            if (getTypename(migratedObject) !== DiagramType.typename) {
              log.info('failed diagram', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
              failed[LegacyTypes.SketchType.typename] = (failed[LegacyTypes.SketchType.typename] ?? 0) + 1;
              continue;
            }
            expect(getTypename(migratedObject)).to.equal(DiagramType.typename);
            expect(data.title).to.equal(migratedObject.name);
            break;

          case LegacyTypes.FileType.typename:
            if (getTypename(migratedObject) !== FileType.typename) {
              log.info('failed file', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
              failed[LegacyTypes.FileType.typename] = (failed[LegacyTypes.FileType.typename] ?? 0) + 1;
              continue;
            }
            expect(getTypename(migratedObject)).to.equal(FileType.typename);
            expect(data.filename).to.equal(migratedObject.filename);
            expect(data.type).to.equal(migratedObject.type);
            expect(data.title).to.equal(migratedObject.name);
            break;

          case LegacyTypes.TableType.typename:
            if (getTypename(migratedObject) !== TableType.typename) {
              log.info('failed table', { objectId, data, spaceId: space?.id, spaceName: space?.properties.name });
              failed[LegacyTypes.TableType.typename] = (failed[LegacyTypes.TableType.typename] ?? 0) + 1;
              continue;
            }
            expect(getTypename(migratedObject)).to.equal(TableType.typename);
            expect(data.title).to.equal(migratedObject.name);
            expect(data.props.length).to.equal(migratedObject.props.length);
            break;

          default:
            log.info('skipping typename', { typename });
        }

        succeeded++;
      }
    }

    log.break();

    log.info('Migration results', { succeeded, failed, total });
  })
    .tag('e2e')
    .timeout(300_000);
});
