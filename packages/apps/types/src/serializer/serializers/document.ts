//
// Copyright 2024 DXOS.org
//

import get from 'lodash.get';

import { next as A, type Prop } from '@dxos/automerge/automerge';
import { AutomergeObject, type EchoReactiveObject, type IDocHandle, getRawDoc } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { DocumentType, TextV0Type, ThreadType } from '../../schema';
import { type SerializerMap, type TypedObjectSerializer, validFilename } from '../serializer';

export const serializer: TypedObjectSerializer = {
  filename: (object: DocumentType) => ({
    name: validFilename(object.title),
    extension: 'md',
  }),

  serialize: async (object: DocumentType, serializers: SerializerMap): Promise<string> => {
    // TODO(mykola): Factor out.
    const getRangeFromCursor = (cursorConverter: CursorConverter, cursor: string) => {
      const parts = cursor.split(':');
      const from = cursorConverter.fromCursor(parts[0]);
      const to = cursorConverter.fromCursor(parts[1]);
      return from && to ? { from, to } : undefined;
    };

    const content = object.content;
    let text: string =
      content instanceof AutomergeObject ? (content as any)[(content as any).field] : E.getTextContent(content);

    // Insert comments.
    const comments = object.comments;
    const threadSerializer = serializers[ThreadType.typename];
    if (!content || !threadSerializer || !comments || comments.length === 0 || content instanceof TextV0Type) {
      return text;
    }
    const doc = getRawDoc(content, [(content as any).field]);
    const convertor = cursorConverter(doc.handle, doc.path);

    const insertions: Record<number, string> = {};
    let footnote = '---\n';
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
      footnote += `${pointer}: ${await threadSerializer.serialize(comment.thread, serializers)}\n`;
    }

    text = text.replace(/(?:)/g, (_, index) => insertions[index] || '');
    return `${text}\n\n${footnote}`;
  },

  deserialize: async (text: string, existingDoc?: EchoReactiveObject<any>) => {
    if (existingDoc) {
      invariant(existingDoc instanceof Document, 'Invalid document');
      invariant(existingDoc.content instanceof AutomergeObject, 'Invalid content');
      (existingDoc.content as any)[(existingDoc.content as any).field] = text;
      return existingDoc;
    } else {
      return E.object(DocumentType, { content: E.object(TextV0Type, { content: text }), comments: [] });
    }
  },
};

interface CursorConverter {
  toCursor(position: number, assoc?: -1 | 1 | undefined): string;
  fromCursor(cursor: string): number;
}

// TODO(burdon): Reconcile with automerge/text-object.
const cursorConverter = (handle: IDocHandle, path: readonly Prop[]) => ({
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
