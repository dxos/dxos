//
// Copyright 2024 DXOS.org
//

import { getSpaceProperty, setSpaceProperty } from '@braneframe/plugin-client/space-properties';
import { FolderType } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { type Migration } from '@dxos/migrations';
import { Filter } from '@dxos/react-client/echo';

export const migrations: Migration[] = [
  {
    version: 1,
    up: ({ space }) => {
      const rootFolder = getSpaceProperty(space, FolderType.typename);
      if (rootFolder instanceof FolderType) {
        return;
      }

      const { objects } = space.db.query(Filter.schema(FolderType, { name: space.key.toHex() }));
      if (objects.length > 0) {
        setSpaceProperty(space, FolderType.typename, objects[0]);
      } else {
        setSpaceProperty(space, FolderType.typename, E.object(FolderType, { name: space.key.toHex(), objects: [] }));
      }
    },
    down: () => {},
  },
  {
    version: 2,
    up: ({ space }) => {
      const rootFolder = getSpaceProperty<FolderType>(space, FolderType.typename)!;
      const { objects } = space.db.query(Filter.schema(FolderType, { name: space.key.toHex() }));
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
