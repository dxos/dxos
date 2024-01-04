//
// Copyright 2024 DXOS.org
//

import { Folder } from '@braneframe/types';
import { type Migration } from '@dxos/migrations';

export const migrations: Migration[] = [
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
  {
    version: 2,
    up: ({ space }) => {
      const rootFolder = space.properties[Folder.schema.typename] as Folder;
      const { objects } = space.db.query(Folder.filter({ name: space.key.toHex() }));
      if (objects.length <= 1) {
        return;
      }
      rootFolder.name = '';
      rootFolder.objects = objects.flatMap(({ objects }) => Array.from(objects));
      objects.forEach((object) => {
        if (object !== rootFolder) {
          space.db.remove(object);
        }
      });
    },
    down: () => {},
  },
];
