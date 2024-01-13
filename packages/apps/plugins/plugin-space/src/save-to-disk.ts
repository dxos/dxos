//
// Copyright 2024 DXOS.org
//

import { Folder, Document, Thread } from '@braneframe/types';
import { AutomergeObject } from '@dxos/echo-schema';
import { type TypedObject, type Space, TextObject, getRawDoc } from '@dxos/react-client/echo';
import { type CursorConverter, cursorConverter } from '@dxos/react-ui-editor';

// TODO(burdon): Rename file serializer.

export const saveSpaceToDisk = async ({ space, directory }: { space: Space; directory: FileSystemDirectoryHandle }) => {
  await space.waitUntilReady();

  const spaceRoot = space.properties[Folder.schema.typename];
  if (!spaceRoot) {
    throw new Error('No root folder.');
  }

  const saveDir = await directory.getDirectoryHandle(space.properties.name || space.key.toHex(), { create: true });
  await writeComposerMetadata({ space, directory: saveDir });
  await saveFolderToDisk(spaceRoot, saveDir);
};

const writeComposerMetadata = async ({ space, directory }: { space: Space; directory: FileSystemDirectoryHandle }) => {
  const version = 1;
  const composerDir = await directory.getDirectoryHandle('.composer', { create: true });
  const metadataFile = await composerDir.getFileHandle('space.json', { create: true });
  const metadata = {
    name: space.properties.name,
    version,
    timestamp: new Date().toUTCString(),
    spaceKey: space.key.toHex(),
  };

  const writable = await metadataFile.createWritable();
  await writable.write(JSON.stringify(metadata, null, 2));
  await writable.close();
};

const saveFolderToDisk = async (echoFolder: Folder, directory: FileSystemDirectoryHandle) => {
  const namesCount = new Map<string, number>();
  const fixNamesCollisions = ({ name = 'Untitled', extension = 'json' }: Partial<FileName> = {}) => {
    if (namesCount.has(name)) {
      const count = namesCount.get(name)!;
      namesCount.set(name, count + 1);
      return `${name} (${count}).${extension}`;
    } else {
      namesCount.set(name, 1);
      return `${name}.${extension}`;
    }
  };

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

    const filename = fixNamesCollisions(serializer.filename(child));
    const fileHandle = await directory.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write((await serializer.serialize(child)) ?? '');
    await writable.close();
  }
};

//
// Serializers
//

type FileName = { name: string; extension: string };

interface TypedObjectSerializer {
  filename(object: TypedObject): FileName;

  serialize(object: TypedObject): Promise<string>;
  deserialize(text: string): Promise<TypedObject>;
}

// TODO(mykola): Factor out to respective plugins as providers.
const serializers: Record<string, TypedObjectSerializer> = {
  [Document.schema.typename]: {
    filename: (object: Document) => ({
      name: object.title?.replace(/[/\\?%*:|"<>]/g, '-'),
      extension: 'md',
    }),

    serialize: async (object: Document): Promise<string> => {
      // TODO(mykola): Factor out.
      const getRangeFromCursor = (cursorConverter: CursorConverter, cursor: string) => {
        const parts = cursor.split(':');
        const from = cursorConverter.fromCursor(parts[0]);
        const to = cursorConverter.fromCursor(parts[1]);
        return from && to ? { from, to } : undefined;
      };

      const content = object.content;
      let text: string = content instanceof AutomergeObject ? (content as any)[(content as any).field] : content.text;

      // Create frontmatter.
      const metadata = {
        title: object.title,
        timestamp: new Date().toUTCString(),
        schema: object.__typename,
        serializer_version: 1,
      };
      const frontmatter = `---\n${Object.entries(metadata)
        .map(([key, val]) => `${key}: ${val}`)
        .join('\n')}\n---`;

      // Insert comments.
      const comments = object.comments;
      const threadSerializer = serializers[Thread.schema.typename];
      if (!threadSerializer || !comments || comments.length === 0 || content instanceof TextObject) {
        return `${frontmatter}\n${text}`;
      }
      const doc = getRawDoc(content, [(content as any).field]);
      const convertor = cursorConverter(doc.handle, doc.path);

      const insertions: Record<number, string> = {};
      let footnote = '---\n';
      {
        for (const [index, comment] of comments.entries()) {
          if (!comment.cursor || !comment.thread) {
            continue;
          }

          const range = getRangeFromCursor(convertor, comment.cursor);
          if (!range) {
            continue;
          }

          const pointer = `[^${index}]`;
          insertions[range.to] = (insertions[range.to] || '') + pointer;
          footnote += `${pointer}: ${await threadSerializer.serialize(comment.thread)}\n`;
        }
      }

      text = text.replace(/(?:)/g, (_, index) => insertions[index] || '');

      return `${frontmatter}\n\n${text}\n\n${footnote}`;
    },

    deserialize: async (text: string) => {
      return new Document({ content: new TextObject(text) });
    },
  },

  [Thread.schema.typename]: {
    filename: (object: Thread) => ({
      name: object.title?.replace(/[/\\?%*:|"<>]/g, '-'),
      extension: 'md',
    }),

    serialize: async (object: Thread): Promise<string> => {
      return (
        object.messages.map((message) => message.blocks.map((block) => `${block.text}`).join(' - ')).join(' | ') ?? ''
      );
    },

    deserialize: async (text: string) => {
      throw new Error('Not implemented.');
    },
  },
};
