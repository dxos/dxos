//
// Copyright 2023 DXOS.org
//

import {
  FolderType,
  DocumentType,
  FileType,
  GridType,
  KanbanType,
  SketchType,
  StackType,
  TableType,
} from '@braneframe/types';
import { CreateEpochRequest } from '@dxos/client/halo';
import { create } from '@dxos/echo-schema';
import { Migrations } from '@dxos/migrations';
import type { Client } from '@dxos/react-client';
import { type Space, SpaceState, Filter } from '@dxos/react-client/echo';

import { appKey } from './constants';
import { migrations } from './migrations';

Migrations.define(appKey, migrations);

const dxosTypes = [DocumentType, FileType, GridType, KanbanType, SketchType, StackType, TableType];

/**
 * Migrate space content from pre-folders into folder structure.
 */
const upgrade035 = async () => {
  const client: Client = (window as any).dxos.client;
  if (client) {
    const defaultSpace = client.spaces.default;
    const personalSpaceFolderSelector = { name: defaultSpace.key.toHex() };
    let personalSpaceFolder = (
      await defaultSpace.db.query(Filter.schema(FolderType, personalSpaceFolderSelector)).run()
    ).objects[0];
    if (!personalSpaceFolder) {
      personalSpaceFolder = create(FolderType, { ...personalSpaceFolderSelector, objects: [] });
    }

    let sharedSpacesFolder = (await defaultSpace.db.query(Filter.schema(FolderType, { name: 'shared-spaces' })).run())
      .objects[0];
    if (!sharedSpacesFolder) {
      sharedSpacesFolder = create(FolderType, { name: 'shared-spaces', objects: [] });
    }

    let rootFolder = (await defaultSpace.db.query(Filter.schema(FolderType, { name: 'root' })).run()).objects[0];
    if (!rootFolder) {
      rootFolder = create(FolderType, { name: 'root', objects: [personalSpaceFolder, sharedSpacesFolder] });
      defaultSpace.db.add(rootFolder);
    }

    const migrateSpaceTasks = client.spaces.get().map(async (space) => {
      if (space.state.get() !== SpaceState.READY) {
        return;
      }

      const queries = await Promise.all(dxosTypes.map((type) => space.db.query(Filter.schema(type as any)).run()));
      let spaceFolder = (await space.db.query(Filter.schema(FolderType, { name: space.key.toHex() })).run()).objects[0];
      if (space === defaultSpace) {
        spaceFolder.objects.push(
          ...queries
            .flatMap((query) => query.objects)
            .filter((object) => spaceFolder.objects.findIndex((o) => o?.id === object.id) === -1),
        );
        return;
      } else if (!spaceFolder) {
        spaceFolder = space.db.add(
          create(FolderType, {
            name: space.key.toHex(),
            objects: queries.flatMap((query) => query.objects),
          }),
        );
      }

      if (sharedSpacesFolder.objects.findIndex((object) => object?.id === spaceFolder.id) === -1) {
        sharedSpacesFolder.objects.push(spaceFolder);
      }
    });
    await Promise.all(migrateSpaceTasks);
  }
};

/**
 * Fragment space content into separate automerge documents.
 */
const fragmentSpaceContent = async (space: Space) => {
  const client: Client = (window as any).dxos.client;
  if (client) {
    await client.services.services.SpacesService?.createEpoch({
      spaceKey: space.key,
      migration: CreateEpochRequest.Migration.FRAGMENT_AUTOMERGE_ROOT,
    });
  }
};

(window as any).composer = {
  upgrade035,
  fragmentSpaceContent,
};
