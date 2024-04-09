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
import * as E from '@dxos/echo-schema';
import { Filter } from '@dxos/echo-schema';
import { Migrations } from '@dxos/migrations';
import type { Client } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';

import { appKey } from './constants';
import { migrations } from './migrations';

Migrations.define(appKey, migrations);

const dxosTypes = [DocumentType, FileType, GridType, KanbanType, SketchType, StackType, TableType];

/**
 * Migrate space content from pre-folders into folder structure.
 */
const upgrade035 = () => {
  const client: Client = (window as any).dxos.client;
  if (client) {
    const defaultSpace = client.spaces.default;
    const personalSpaceFolderSelector = { name: defaultSpace.key.toHex() };
    let personalSpaceFolder = defaultSpace.db.query(Filter.schema(FolderType, personalSpaceFolderSelector)).objects[0];
    if (!personalSpaceFolder) {
      personalSpaceFolder = E.object(FolderType, { ...personalSpaceFolderSelector, objects: [] });
    }

    let sharedSpacesFolder = defaultSpace.db.query(Filter.schema(FolderType, { name: 'shared-spaces' })).objects[0];
    if (!sharedSpacesFolder) {
      sharedSpacesFolder = E.object(FolderType, { name: 'shared-spaces', objects: [] });
    }

    let rootFolder = defaultSpace.db.query(Filter.schema(FolderType, { name: 'root' })).objects[0];
    if (!rootFolder) {
      rootFolder = E.object(FolderType, { name: 'root', objects: [personalSpaceFolder, sharedSpacesFolder] });
      defaultSpace.db.add(rootFolder);
    }

    client.spaces.get().forEach((space) => {
      if (space.state.get() !== SpaceState.READY) {
        return;
      }
      const queries = dxosTypes.map((type) => space.db.query(Filter.schema(type as any)));
      let spaceFolder = space.db.query(Filter.schema(FolderType, { name: space.key.toHex() })).objects[0];
      if (space === defaultSpace) {
        spaceFolder.objects.push(
          ...queries
            .flatMap((query) => query.objects)
            .filter((object) => spaceFolder.objects.findIndex((o) => o?.id === object.id) === -1),
        );
        return;
      } else if (!spaceFolder) {
        spaceFolder = space.db.add(
          E.object(FolderType, {
            name: space.key.toHex(),
            objects: queries.flatMap((query) => query.objects),
          }),
        );
      }

      if (sharedSpacesFolder.objects.findIndex((object) => object?.id === spaceFolder.id) === -1) {
        sharedSpacesFolder.objects.push(spaceFolder);
      }
    });
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
