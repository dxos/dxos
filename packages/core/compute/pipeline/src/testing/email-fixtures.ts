//
// Copyright 2026 DXOS.org
//

import { type ContentBlock, Message } from '@dxos/types';

import { type ParquetRow } from './parquet';

// Shared, test-only email fixtures. NOT re-exported from `testing/index.ts`: it imports @dxos/types
// (a dev-only dependency), so keeping it out of the published entrypoint keeps the bundle effect-only.

/** Coerce a parquet timestamp cell (a `Date`, or a string/number) to an ISO string. */
export const asIso = (value: unknown): string =>
  (value instanceof Date ? value : new Date(String(value))).toISOString();

/** Map one email row (see the dataset's `dataset_info` schema) to a Message carrying the body as a text block. */
export const emailToMessage = (row: ParquetRow): Message.Message => {
  const block: ContentBlock.Text = { _tag: 'text', text: String(row.body ?? '') };
  return Message.make({
    created: asIso(row.date),
    sender: { email: String(row.from ?? '') },
    blocks: [block],
    properties: {
      messageId: row.message_id,
      subject: row.subject,
      to: row.to,
      cc: row.cc,
      bcc: row.bcc,
      fileName: row.file_name,
    },
  });
};
