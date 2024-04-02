//
// Copyright 2023 DXOS.org
//

import { Document, Folder, File, Grid, Kanban, Table, Sketch, Stack } from '@braneframe/types/proto';
import { CreateEpochRequest } from '@dxos/client/halo';
import { Migrations } from '@dxos/migrations';
import type { Client } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';

import { appKey } from './constants';
import { migrations } from './migrations';

Migrations.define(appKey, migrations);

const dxosTypes = {
  Document,
  File,
  Grid,
  Kanban,
  Sketch,
  Stack,
  Table,
};

/**
 * Migrate space content from pre-folders into folder structure.
 */
const upgrade035 = () => {
  const client: Client = (window as any).dxos.client;
  if (client) {
    const defaultSpace = client.spaces.default;
    const personalSpaceFolderSelector = { name: defaultSpace.key.toHex() };
    let personalSpaceFolder = defaultSpace.db.query(Folder.filter(personalSpaceFolderSelector)).objects[0];
    if (!personalSpaceFolder) {
      personalSpaceFolder = new Folder(personalSpaceFolderSelector);
    }

    let sharedSpacesFolder = defaultSpace.db.query(Folder.filter({ name: 'shared-spaces' })).objects[0];
    if (!sharedSpacesFolder) {
      sharedSpacesFolder = new Folder({ name: 'shared-spaces' });
    }

    let rootFolder = defaultSpace.db.query(Folder.filter({ name: 'root' })).objects[0];
    if (!rootFolder) {
      rootFolder = new Folder({ name: 'root', objects: [personalSpaceFolder, sharedSpacesFolder] });
      defaultSpace.db.add(rootFolder);
    }

    client.spaces.get().forEach((space) => {
      if (space.state.get() !== SpaceState.READY) {
        return;
      }
      const types = Object.values(dxosTypes);
      const queries = types.map((type) => space.db.query(type.filter()));
      let spaceFolder = space.db.query(Folder.filter({ name: space.key.toHex() })).objects[0];
      if (space === defaultSpace) {
        spaceFolder.objects.push(
          ...queries
            .flatMap((query) => query.objects)
            .filter((object) => spaceFolder.objects.findIndex((o) => o.id === object.id) === -1),
        );
        return;
      } else if (!spaceFolder) {
        spaceFolder = space.db.add(
          new Folder({
            name: space.key.toHex(),
            objects: queries.flatMap((query) => query.objects),
          }),
        );
      }

      if (sharedSpacesFolder.objects.findIndex((object) => object.id === spaceFolder.id) === -1) {
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
