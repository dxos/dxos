//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { Document, Thread } from '@braneframe/types';
import { next as A, type Prop } from '@dxos/automerge/automerge';
import { AutomergeObject, base, getTypeRef, type IDocHandle } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { TypedObject, TextObject, getRawDoc } from '@dxos/react-client/echo';

export interface CursorConverter {
  toCursor(position: number, assoc?: -1 | 1 | undefined): string;
  fromCursor(cursor: string): number;
}

// TODO(burdon): Reconcile with cursorConverter.
const cursorConverter = (handle: IDocHandle, path: Prop[]) => ({
  toCursor: (pos: number): string => {
    const doc = handle.docSync();
    if (!doc) {
      return '';
    }

    const value = get(doc, path);
    if (typeof value === 'string' && value.length <= pos) {
      return 'end';
    }

    // NOTE: Slice is needed because getCursor mutates the array.
    return A.getCursor(doc, path.slice(), pos);
  },

  fromCursor: (cursor: string): number => {
    if (cursor === '') {
      return 0;
    }

    const doc = handle.docSync();
    if (!doc) {
      return 0;
    }

    if (cursor === 'end') {
      const value = get(doc, path);
      if (typeof value === 'string') {
        return value.length;
      } else {
        return 0;
      }
    }

    // NOTE: Slice is needed because getCursor mutates the array.
    return A.getCursorPosition(doc, path.slice(), cursor);
  },
});

export type FileName = { name: string; extension: string };

export interface TypedObjectSerializer {
  filename(object: TypedObject): FileName;

  serialize(object: TypedObject): Promise<string>;

  /**
   * @param object Deserializing into an existing object. If not provided, a new object is created.
   */
  deserialize(text: string, object?: TypedObject): Promise<TypedObject>;
}

// TODO(mykola): Factor out to respective plugins as providers.
export const serializers: Record<string, TypedObjectSerializer> = {
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

      // Insert comments.
      const comments = object.comments;
      const threadSerializer = serializers[Thread.schema.typename];
      if (!threadSerializer || !comments || comments.length === 0 || content instanceof TextObject) {
        return text;
      }
      const doc = getRawDoc(content, [(content as any).field]);
      const convertor = cursorConverter(doc.handle, doc.path as Prop[]);

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

      return `${text}\n\n${footnote}`;
    },

    deserialize: async (text: string, existingDoc?: TypedObject) => {
      if (existingDoc) {
        invariant(existingDoc instanceof Document, 'Invalid document');
        invariant(existingDoc.content instanceof AutomergeObject, 'Invalid content');
        (existingDoc.content as any)[(existingDoc.content as any).field] = text;
        return existingDoc;
      } else {
        return new Document({ content: new TextObject(text) });
      }
    },
  },

  [Thread.schema.typename]: {
    filename: (object: Thread) => ({
      name: object.title?.replace(/[/\\?%*:|"<>]/g, '-'),
      extension: 'md',
    }),

    serialize: async (object: Thread): Promise<string> => {
      return (
        object.messages
          .map((message) => message.blocks.map((block) => `${block.content?.text}`).join(' - '))
          .join(' | ') ?? ''
      );
    },

    deserialize: async (text: string) => {
      throw new Error('Not implemented.');
    },
  },

  default: {
    filename: () => ({ name: 'Untitled', extension: 'json' }),
    serialize: async (object: TypedObject) => JSON.stringify(object.toJSON(), null, 2),
    deserialize: async (text: string, object?: TypedObject) => {
      const { '@id': id, '@type': type, '@meta': meta, ...data } = JSON.parse(text);
      if (!object) {
        const deserializedObject = new TypedObject(
          Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@'))),
          {
            meta,
            type: getTypeRef(type),
          },
        );
        deserializedObject[base]._id = id;
        return deserializedObject;
      } else {
        Object.entries(data)
          .filter(([key]) => !key.startsWith('@'))
          .forEach(([key, value]: any) => {
            object[key] = value;
          });
        return object;
      }
    },
  },
};
