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

export const getSpaceBackup = async (space: Space, defaultDocumentTitle: string): Promise<SpaceBackup> => {
  const itemsQuery = space.db.query(ComposerDocument.filter());
  const namesCount = new Map<string, number>();
  const getFileName = (title: string) => {
    const displayTitle = title || defaultDocumentTitle;
    if (namesCount.has(displayTitle)) {
      const count = namesCount.get(displayTitle)!;
      namesCount.set(displayTitle, count + 1);
      return `${displayTitle} (${count})`;
    } else {
      namesCount.set(displayTitle, 1);
      return displayTitle;
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

export const backupSpace = async (space: Space, defaultDocumentTitle: string): Promise<Blob> => {
  const backup = await getSpaceBackup(space, defaultDocumentTitle);
  const backupPackage = new JSZip();
  backupPackage.file('composer-space-backup.json', JSON.stringify(backup));
  const items = backupPackage.folder('items');
  backup.items.forEach((docBackup) => {
    const document = space.db.getObjectById(docBackup.origin!.id!) as ComposerDocument;
    items!.file(docBackup.fileName, document?.content.content?.toString() ?? '');
  });
  return backupPackage.generateAsync({ type: 'blob' });
};
