//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { type SpaceId, SpaceState, getTypename } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Migrations } from '@dxos/migrations';
import {
  copyDirSync,
  createConfig,
  getBaseDataDir,
  SnapshotsRegistry,
  type SpacesDump,
  type SnapshotDescription,
} from '@dxos/proto-guard';
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

describe('Run migrations on storage snapshot', () => {
  const baseDir = getBaseDataDir();

  const copySnapshotToTmp = (snapshot: SnapshotDescription) => {
    const testStoragePath = path.join('/', 'tmp', `proto-guard-${PublicKey.random().toHex()}`);

    const storagePath = path.join(baseDir, snapshot.dataRoot);
    log.info('Copy storage', { src: storagePath, dest: testStoragePath });
    copyDirSync(storagePath, testStoragePath);
    afterTest(() => fs.rmSync(testStoragePath, { recursive: true }));

    return testStoragePath;
  };

  test(__COMPOSER_MIGRATIONS__[1].version, async () => {
    const snapshot = SnapshotsRegistry.getSnapshot(__COMPOSER_MIGRATIONS__[1].version);
    invariant(snapshot, 'Snapshot not found');
    log.info('Testing snapshot', { snapshot });

    const tmp = copySnapshotToTmp(snapshot);

    const client = new Client({ config: createConfig({ dataRoot: tmp }) });
    await asyncTimeout(client.initialize(), 2_000);
    afterTest(() => client.destroy());

    log.break();

    await client.spaces.isReady.wait();

    log.info('Running protocols migrations');

    for (const space of client.spaces.get()) {
      if (space.state.get() === SpaceState.REQUIRES_MIGRATION) {
        log.info('migrating space', { id: space.id });
        await space.internal.migrate();
      }
    }

    log.info('Checking protocols migrations');

    for (const space of client.spaces.get()) {
      expect(space.state.get()).to.equal(SpaceState.READY);
    }

    log.info('Preparing for composer migrations');

    const spacesDump: SpacesDump = {};
    for (const space of client.spaces.get()) {
      const { objects } = await space.db.query().run();

      spacesDump[space.id] = {};
      for (const object of objects) {
        spacesDump[space.id][object.id] = {
          typename: getTypename(object),
          data: { ...object },
        };
      }
    }

    log.info('Running composer migrations');

    for (const space of client.spaces.get()) {
      await Migrations.migrate(space, __COMPOSER_MIGRATIONS__[1].version);
    }

    log.info('Checking composer migrations');

    for (const [spaceId, objects] of Object.entries(spacesDump)) {
      for (const [objectId, object] of Object.entries(objects)) {
        const space = client.spaces.get(spaceId as SpaceId);
        const migratedObject = space?.db.getObjectById(objectId);
        const { typename, data } = object;
        switch (typename) {
          case LegacyTypes.FolderType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(CollectionType.typename);
            expect(data.title).to.equal(migratedObject?.name);
            expect(data.objects.length).to.equal(migratedObject?.objects.length);
            break;

          case LegacyTypes.StackType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(CollectionType.typename);
            expect(data.title).to.equal(migratedObject?.name);
            expect(data.sections.length).to.equal(migratedObject?.objects.length);
            break;

          case LegacyTypes.SectionType.typename:
            expect(migratedObject).to.be.undefined;
            break;

          case LegacyTypes.DocumentType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(DocumentType.typename);
            expect(data.title).to.equal(migratedObject?.name);
            break;

          case LegacyTypes.TextType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(TextType.typename);
            expect(data.content).to.equal(migratedObject?.content);
            break;

          case LegacyTypes.ThreadType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(ThreadType.typename);
            expect(data.title).to.equal(migratedObject?.name);
            expect(data.messages.length).to.equal(migratedObject?.messages.length);
            break;

          case LegacyTypes.MessageType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(MessageType.typename);
            expect(data.blocks[0]?.timestamp).to.equal(migratedObject?.timestamp);
            break;

          case LegacyTypes.SketchType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(DiagramType.typename);
            expect(data.title).to.equal(migratedObject?.name);
            break;

          case LegacyTypes.FileType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(FileType.typename);
            expect(data.filename).to.equal(migratedObject?.type);
            expect(data.type).to.equal(migratedObject?.type);
            expect(data.title).to.equal(migratedObject?.name);
            break;

          case LegacyTypes.TableType.typename:
            expect(migratedObject && getTypename(migratedObject)).to.equal(TableType.typename);
            expect(data.title).to.equal(migratedObject?.name);
            expect(data.props.length).to.equal(migratedObject?.props.length);
            break;

          default:
            log.info('skipping typename', { typename });
        }
      }
    }

    log.break();
  }).timeout(10_000);
});
