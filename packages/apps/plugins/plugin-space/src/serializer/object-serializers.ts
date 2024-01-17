//
// Copyright 2024 DXOS.org
//

import { Document, Thread } from '@braneframe/types';
import { AutomergeObject } from '@dxos/echo-schema';
import { type TypedObject, TextObject, getRawDoc } from '@dxos/react-client/echo';
import { type CursorConverter, cursorConverter } from '@dxos/react-ui-editor';

export type FileName = { name: string; extension: string };

export interface TypedObjectSerializer {
  filename(object: TypedObject): FileName;

  serialize(object: TypedObject): Promise<string>;
  deserialize(text: string): Promise<TypedObject>;
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

      return `${text}\n\n${footnote}`;
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
