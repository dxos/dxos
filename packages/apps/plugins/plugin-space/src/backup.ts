//
// Copyright 2023 DXOS.org
//

import JSZip from 'jszip';

// TODO(wittjosiah): Factor Document functionality out to markdown plugin.
import { Document } from '@braneframe/types';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { type YText } from '@dxos/text-model';

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

export const createBackup = async (space: Space, defaultDocumentTitle: string): Promise<SpaceBackup> => {
  // TODO(burdon): Not just documents.
  const itemsQuery = space.db.query(Document.filter());
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
      ...(space.properties.name && { name: space.properties.name }),
    },
    items: itemsQuery.objects.map((document) => ({
      origin: { id: document.id, title: document.title },
      fileName: `${getFileName(document.title)}.md`,
    })),
  };
};

// TODO(burdon): Factor out to ECHO (need common functions for data import/export, with composer-specific additions).

export const exportData = async (space: Space, title: string): Promise<Blob> => {
  const backup = await createBackup(space, title);
  const backupPackage = new JSZip();
  backupPackage.file('space.json', JSON.stringify(backup));
  const items = backupPackage.folder('items');
  backup.items.forEach((docBackup) => {
    const document = space.db.getObjectById(docBackup.origin!.id!) as Document;
    items!.file(docBackup.fileName, document?.content.content?.toString() ?? '');
  });

  return backupPackage.generateAsync({ type: 'blob' });
};

export const importData = async (space: Space, backupBlob: Blob) => {
  const backupPackage = await JSZip.loadAsync(backupBlob);
  const backupString = await backupPackage.file('space.json')?.async('string');
  try {
    const backup = JSON.parse(backupString!) as SpaceBackup;
    await Promise.all(
      backup.items.map(async ({ fileName, origin = {} }) => {
        const { id, title } = origin;
        const extantDoc = id ? space.db.getObjectById<Document>(id) : undefined;
        const targetDoc = extantDoc ?? space.db.add(new Document());
        const docContent = await backupPackage.file(`items/${fileName}`)?.async('string');
        if (targetDoc && targetDoc.content.content) {
          targetDoc.content.content.delete(0, targetDoc.content.content.length);
          (targetDoc.content.content as YText).insert(0, docContent ?? '');
          if (title) {
            targetDoc.title = title;
          }
        }
      }),
    );
  } catch (err) {
    log.catch(err);
  }
};
