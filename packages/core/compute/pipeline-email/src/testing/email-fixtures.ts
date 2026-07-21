//
// Copyright 2026 DXOS.org
//

import { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';

import { type ContentBlock, Message } from '@dxos/types';

import { type ParquetRow } from './parquet';

// Maps rows from the Enron email dataset (see the dataset's `dataset_info` schema) onto ECHO Messages.

/**
 * First shard of the Enron email dataset (https://huggingface.co/datasets/corbt/enron-emails). The
 * HuggingFace CDN serves it with range requests + permissive CORS, so a browser reads only the first
 * N rows (a few row-group byte ranges) rather than the whole ~185 MB file.
 */
export const DEFAULT_ENRON_URL =
  'https://huggingface.co/datasets/corbt/enron-emails/resolve/main/data/train-00000-of-00003.parquet';

export type LoadEnronOptions = {
  /** Number of messages to read from the start of the dataset. */
  readonly count?: number;
  /** Parquet URL to read from; defaults to {@link DEFAULT_ENRON_URL}. */
  readonly url?: string;
};

/**
 * Load the first `count` (default 100) Enron messages directly from the dataset parquet over HTTP.
 * Browser-safe: uses hyparquet's URL async buffer (range requests), so only the byte ranges the first
 * rows need are fetched. Rows are mapped to ECHO Messages via {@link emailToMessage}.
 */
export const loadEnronMessages = async ({ count = 100, url = DEFAULT_ENRON_URL }: LoadEnronOptions = {}): Promise<
  Message.Message[]
> => {
  const file = await asyncBufferFromUrl({ url });
  const metadata = await parquetMetadataAsync(file);
  const rows = await parquetReadObjects({ file, metadata, rowStart: 0, rowEnd: count });
  return rows.map((row) => emailToMessage(row as ParquetRow));
};

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
