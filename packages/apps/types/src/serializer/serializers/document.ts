//
// Copyright 2024 DXOS.org
//

import { createDocAccessor, getRangeFromCursor, getObjectCore, createEchoObject } from '@dxos/client/echo';
import { create } from '@dxos/echo-schema';

import { type TypedObjectSerializer, validFilename } from './default';
import { DocumentType, TextType, ThreadType } from '../../schema';

export const serializer: TypedObjectSerializer<DocumentType> = {
  filename: (object: DocumentType) => ({
    name: validFilename(object.name),
    extension: 'md',
  }),

  serialize: async ({ object, serializers }): Promise<string> => {
    const content = object.content;
    let text: string = content?.content ?? '';

    // Insert comments.
    const threads = object.threads;
    const threadSerializer = serializers[ThreadType.typename];
    if (!content || !threadSerializer || !threads || threads.length === 0 || content instanceof TextType) {
      return text;
    }
    const doc = createDocAccessor(content, [(content as any).field]);

    const insertions: Record<number, string> = {};
    let footnote = '---\n';
    for (const [index, thread] of threads.entries()) {
      if (!thread.anchor) {
        continue;
      }
      const range = getRangeFromCursor(doc, thread.anchor);
      if (!range) {
        continue;
      }
      const pointer = `[^${index}]`;
      insertions[range.end] = (insertions[range.end] || '') + pointer;
      footnote += `${pointer}: ${await threadSerializer.serialize({ object: thread, serializers })}\n`;
    }

    text = text.replace(/(?:)/g, (_, index) => insertions[index] || '');
    return `${text}\n\n${footnote}`;
  },

  deserialize: async ({ content, file, object: existingDoc }) => {
    if (existingDoc instanceof DocumentType) {
      existingDoc.content!.content = content;
      return existingDoc;
    } else {
      const doc = createEchoObject(create(DocumentType, { content: create(TextType, { content }), threads: [] }));

      if (file) {
        const core = getObjectCore(doc);
        core.id = file.id;
      }

      return doc;
    }
  },
};
