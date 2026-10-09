//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Blob } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { type GmailDataset, GoogleMailApi } from '#services';

import { type AttachmentMetadata } from '../mapper.ts';
import { fetchAttachments } from './fetch.ts';

const MB = 1024 * 1024;

// Guards the fix for the production `syncMail` OOM ("Worker exceeded memory limit.", 128 MB isolate):
// an attachment past the inline blob cap must be dropped from the download list by its metadata `size`,
// before `getAttachment` pulls its bytes into memory (the pipeline drops it post-download regardless).
describe('fetchAttachments', () => {
  test('skips attachments past the inline blob cap before downloading, keeps the rest', async ({ expect }) => {
    const downloads: string[] = [];
    const small: AttachmentMetadata = {
      attachmentId: 'small',
      size: 1 * MB,
      mimeType: 'application/pdf',
      filename: 'small.pdf',
    };
    const oversized: AttachmentMetadata = {
      attachmentId: 'oversized',
      size: Blob.MAX_INLINE_SIZE + 1,
      mimeType: 'application/pdf',
      filename: 'oversized.pdf',
    };
    // Only the small attachment's bytes are registered — the oversized one must never be fetched.
    const dataset: GmailDataset = {
      labels: [],
      messages: [],
      attachments: { small: { size: small.size, data: Buffer.alloc(small.size, 0x61).toString('base64') } },
    };
    const countingApi = Layer.effect(
      GoogleMailApi,
      Effect.gen(function* () {
        const inner = yield* GoogleMailApi;
        return GoogleMailApi.of({
          ...inner,
          getAttachment: (userId, messageId, attachmentId) => {
            downloads.push(attachmentId);
            return inner.getAttachment(userId, messageId, attachmentId);
          },
        });
      }),
    ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));

    const result = await EffectEx.runPromise(
      fetchAttachments('me', 'msg-1', [small, oversized]).pipe(Effect.provide(countingApi)),
    );

    expect(downloads).toEqual(['small']);
    expect(result.map((attachment) => attachment.name)).toEqual(['small.pdf']);
  });
});
