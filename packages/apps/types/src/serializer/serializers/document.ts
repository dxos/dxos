//
// Copyright 2024 DXOS.org
//

import { createDocAccessor, getRangeFromCursor, getObjectCore, createEchoObject } from '@dxos/client/echo';
import { create } from '@dxos/echo-schema';

import { type TypedObjectSerializer, validFilename } from './default';
import { DocumentType, TextV0Type, ThreadType } from '../../schema';

export const serializer: TypedObjectSerializer<DocumentType> = {
  filename: (object: DocumentType) => ({
    name: validFilename(object.title),
    extension: 'md',
  }),

  serialize: async ({ object, serializers }): Promise<string> => {
    const content = object.content;
    let text: string = content?.content ?? '';

    // Insert comments.
    const comments = object.comments;
    const threadSerializer = serializers[ThreadType.typename];
    if (!content || !threadSerializer || !comments || comments.length === 0 || content instanceof TextV0Type) {
      return text;
    }
    const doc = createDocAccessor(content, [(content as any).field]);

    const insertions: Record<number, string> = {};
    let footnote = '---\n';
    for (const [index, comment] of comments.entries()) {
      if (!comment.cursor || !comment.thread) {
        continue;
      }
      const range = getRangeFromCursor(doc, comment.cursor);
      if (!range) {
        continue;
      }
      const pointer = `[^${index}]`;
      insertions[range.end] = (insertions[range.end] || '') + pointer;
      footnote += `${pointer}: ${await threadSerializer.serialize({ object: comment.thread, serializers })}\n`;
    }

    text = text.replace(/(?:)/g, (_, index) => insertions[index] || '');
    return `${text}\n\n${footnote}`;
  },

  deserialize: async ({ content, file, object: existingDoc, newId }) => {
    if (existingDoc instanceof DocumentType) {
      existingDoc.content!.content = content;
      return existingDoc;
    } else {
      const doc = createEchoObject(create(DocumentType, { content: create(TextV0Type, { content }), comments: [] }));

      if (file && !newId) {
        const core = getObjectCore(doc);
        core.id = file.id;
      }

      return doc;
    }
  },
};
