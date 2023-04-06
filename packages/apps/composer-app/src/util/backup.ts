//
// Copyright 2023 DXOS.org
//

import { Space } from '@dxos/client';

import { ComposerDocument } from '../proto';

export type ComposerDocumentBackup = {
  origin?: Partial<{
    id: string;
    title: string;
  }>;
  fileName: string;
};

export type SpaceBackup = {
  origin?: Partial<{
    key: string;
    name: string;
  }>;
  items: ComposerDocumentBackup[];
};

export const backup = async (space: Space): Promise<SpaceBackup> => {
  const itemsQuery = space.db.query(ComposerDocument.filter());
  const namesCount = new Map<string, number>();
  return {
    origin: {
      key: space.key.toHex(),
      ...(space.properties.name && { name: space.properties.name })
    },
    items: itemsQuery.objects.map((document) => ({
      origin: { id: document.id, title: document.title },
      // todo(thure): de-collide similar names
      fileName: document.title
    }))
  };
};
