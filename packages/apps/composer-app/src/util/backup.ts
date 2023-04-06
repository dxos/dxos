//
// Copyright 2023 DXOS.org
//

import JSZip from 'jszip';

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

export const getSpaceBackup = async (space: Space): Promise<SpaceBackup> => {
  const itemsQuery = space.db.query(ComposerDocument.filter());
  const namesCount = new Map<string, number>();
  const getFileName = (title: string) => {
    if (namesCount.has(title)) {
      const count = namesCount.get(title)!;
      namesCount.set(title, count + 1);
      return `${title} (${count})`;
    } else {
      namesCount.set(title, 1);
      return title;
    }
  };
  return {
    origin: {
      key: space.key.toHex(),
      ...(space.properties.name && { name: space.properties.name })
    },
    items: itemsQuery.objects.map((document) => ({
      origin: { id: document.id, title: document.title },
      fileName: `${getFileName(document.title)}.md`
    }))
  };
};

export const backupSpace = async (space: Space): Promise<Blob> => {
  const backup = await getSpaceBackup(space);
  const backupPackage = new JSZip();
  backupPackage.file('backup.json', JSON.stringify(backup));
  const items = backupPackage.folder('items');
  backup.items.forEach((docBackup) => {
    const document = space.db.getObjectById(docBackup.origin!.id!) as ComposerDocument;
    items!.file(docBackup.fileName, document?.content.content?.toString() ?? '');
  });
  return backupPackage.generateAsync({ type: 'blob' });
};
