//
// Copyright 2023 DXOS.org
//

import { Document, Folder, File, Grid, Kanban, Table, Sketch, Stack } from '@braneframe/types';
import { Migrations } from '@dxos/migrations';
import type { Client } from '@dxos/react-client';
import { EchoDatabase, SpaceProxy, SpaceState, TypedObject } from '@dxos/react-client/echo';

export const appKey = 'composer.dxos.org';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

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

(window as any).composer = {
  upgrade035,
};

Migrations.define(appKey, [
  {
    version: 1,
    up: ({ space }) => {
      const rootFolder = space.properties[Folder.schema.typename];
      if (rootFolder instanceof Folder) {
        return;
      }

      const { objects } = space.db.query(Folder.filter({ name: space.key.toHex() }));
      if (objects.length > 0) {
        space.properties[Folder.schema.typename] = objects[0];
      } else {
        space.properties[Folder.schema.typename] = new Folder({ name: space.key.toHex() });
      }
    },
    down: () => {},
  },
  // TODO(wittjosiah): Include this migration once https://github.com/dxos/dxos/pull/4757 is fixed.
  // {
  //   version: ,
  //   up: ({ space }) => {
  //     const rootFolder = space.properties[Folder.schema.typename] as Folder;
  //     const { objects } = space.db.query(Folder.filter({ name: space.key.toHex() }));
  //     if (objects.length <= 1) {
  //       return;
  //     }
  //     rootFolder.objects = objects.flatMap(({ objects }) => objects);
  //     objects.forEach((object) => {
  //       if (object !== rootFolder) {
  //         space.db.remove(object);
  //       }
  //     });
  //   },
  //   down: () => {},
  // },
]);
