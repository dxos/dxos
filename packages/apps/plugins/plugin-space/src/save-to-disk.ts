//
// Copyright 2024 DXOS.org
//

import { Folder, Document } from '@braneframe/types';
import { AutomergeObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { plate } from '@dxos/plate';
import { type TypedObject, type Space, TextObject, getRawDoc } from '@dxos/react-client/echo';
import { type CursorConverter, cursorConverter } from '@dxos/react-ui-editor';

export const saveSpaceToDisk = async ({ space, directory }: { space: Space; directory: FileSystemDirectoryHandle }) => {
  await space.waitUntilReady();

  const spaceRoot = space.properties[Folder.schema.typename];
  if (!spaceRoot) {
    throw new Error('No root folder.');
  }

  const root = await directory.getDirectoryHandle(space.properties.name || space.key.toHex(), { create: true });
  await saveFolderToDisk(spaceRoot, root);
};

const saveFolderToDisk = async (echoFolder: Folder, directory: FileSystemDirectoryHandle) => {
  for (const child of echoFolder.objects) {
    if (child instanceof Folder) {
      const childDirectory = await directory.getDirectoryHandle(child.name, { create: true });
      await saveFolderToDisk(child, childDirectory);
      continue;
    }

    if (!child.__typename) {
      continue;
    }
    const serializer = serializers[child.__typename];
    if (!serializer) {
      continue;
    }

    const fileHandle = await directory.getFileHandle(serializer.filename(child, 'Untitled'), { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(await serializer.serialize(child));
    await writable.close();
  }
};
interface TypedObjectSerializer {
  filename(object: TypedObject, defaultFilename?: string): string;

  serialize(object: TypedObject): Promise<string>;
  deserialize(text: string): Promise<TypedObject>;
}

const serializers: Record<string, TypedObjectSerializer> = {
  [Document.schema.typename]: {
    filename: (object: Document, defaultFilename: string) =>
      `${object.title?.replace(/[/\\?%*:|"<>]/g, '-') ?? defaultFilename}.md`,

    serialize: async (object: Document) => {
      // TODO(mykola): Factor out.
      const getRangeFromCursor = (cursorConverter: CursorConverter, cursor: string) => {
        const parts = cursor.split(':');
        const from = cursorConverter.fromCursor(parts[0]);
        const to = cursorConverter.fromCursor(parts[1]);
        return from && to ? { from, to } : undefined;
      };

      const content = object.content;
      invariant(content instanceof AutomergeObject, 'Support only AutomergeObject.');

      let text: string = content[(content as TypedObject).field];
      const comments = object.comments;
      const doc = getRawDoc(content, [(content as TypedObject).field]);
      const convertor = cursorConverter(doc.handle, doc.path);

      const insertions: Record<number, string> = {};
      let footnote = '';
      comments.forEach((comment, index) => {
        if (!comment.cursor) {
          return;
        }
        const range = getRangeFromCursor(convertor, comment.cursor);
        if (!range) {
          return;
        }
        insertions[range.to] = (insertions[range.to] || '') + `[^${index}]`;
        footnote += plate`[^${index}]: ${comment.thread?.messages
          .map((message) => message.blocks.map((block) => `${block.text}`).join(' - '))
          .join('\n')}\n\n`;
      });

      text = text.replace(/(?:)/g, (_, index) => insertions[index] || '');
      text += `\n\n${footnote}`;

      return text;
    },

    deserialize: async (text: string) => {
      return new Document({ content: new TextObject(text) });
    },
  },
};
