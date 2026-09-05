//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Blob, Feed, Filter, Query, Ref, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { seedMailboxBinding } from '@dxos/plugin-inbox/testing/sync';

import { type GmailDataset } from '#services';

import type * as GoogleMail from '../../../apis/GoogleMail/types';
import { GMAIL_CONNECTOR_ID, GMAIL_SOURCE } from '../../../constants';
import { generateGmailDataset } from '../../../testing/gmail-fixtures';
import { googleSyncTestServices, runGoogleSync } from '../../../testing/sync-fixture';

// Measures peak heap across one sync run against attachment bytes, to size the `exceededMemory`
// outcome operation-service records for every Gmail sync in production. Gated by `DX_MEM` because it
// allocates hundreds of MB and samples the heap; sizes overridable via `DX_MEM_KB`/`DX_MEM_COUNT`:
//
//   DX_MEM=1 moon run plugin-google:test -- src/operations/mail/sync/sync-attachment-memory.test.ts
//
// FIDELITY CAVEAT: this is Node, not workerd. It measures what the pipeline ALLOCATES per attachment
// byte; it cannot reproduce workerd's 128 MB isolate cap, so read the ratio, not a pass/fail.
//
// Measured 2026-09-04, holding TOTAL payload at 5 MiB and varying only the attachment size. Vary the
// payload instead and the peak saturates once it passes ~800 MiB, which reads as a falling per-byte
// cost at the large sizes — an artifact of the ceiling, not a real improvement:
//
//   count x size    peak heap   heap delta   per byte
//      80 x   64K    483.6 MiB    303.0 MiB      60.6x
//      20 x  256K    623.4 MiB    441.8 MiB      88.4x
//       5 x 1024K    706.7 MiB    525.4 MiB     105.1x
//       2 x 2560K    700.2 MiB    519.1 MiB     103.8x
//
// Cost per byte RISES with attachment size and plateaus near 1 MiB, because the peak tracks what the
// pipeline holds live at once (`fetchConcurrency` 5, `commitPageSize` 10) rather than the run's total
// — so a few large attachments are worse than many small ones of the same weight. At ~105x, and over
// a 13.5 MiB no-attachment baseline, (128 - 13.5) / 105 puts a SINGLE 1 MiB attachment on the 128 MiB
// isolate limit.
//
// Every run reports every blob INLINE: `operation-service` depends on neither `@dxos/client` nor any
// other registrant of a blob backend (`registerBlobBackend` appears nowhere in dxos/edge), so the
// registry keeps its `'inline'` default and each attachment is embedded in the Automerge document.
//
// `DX_MEM_BACKEND=1` registers a default backend to stand in for blob-service. Same run, 5 x 1 MiB:
//
//                    peak heap   heap delta   per byte   blobs
//   inline            620.0 MiB    438.8 MiB     87.76x   5 inline
//   blob backend      205.2 MiB     23.9 MiB      4.78x   5 external
//
// Routing the bytes out of the document is an 18x cut in allocation, and what remains is the
// pipeline's own cost rather than the payload's.

const ATTACHMENT_KB = Number.parseInt(process.env.DX_MEM_KB ?? '512', 10);
const MESSAGE_COUNT = Number.parseInt(process.env.DX_MEM_COUNT ?? '20', 10);

const seedGmailBinding = (builder: EchoTestBuilder) =>
  seedMailboxBinding(builder, { source: GMAIL_SOURCE, connectorId: GMAIL_CONNECTOR_ID });

/**
 * Gives every message one attachment part of `bytes` bytes, each with DISTINCT content: a
 * content-addressed backend would otherwise store one object for the whole run and be measured
 * against an inline path that embeds all of them.
 */
const withAttachments = (dataset: GmailDataset, bytes: number): GmailDataset => {
  const attachments: Record<string, GoogleMail.MessagePartBody> = {};
  const messages = dataset.messages.map((message, index) => {
    const attachmentId = `att-${message.id}`;
    const data = Buffer.alloc(bytes, index % 251).toString('base64url');
    attachments[attachmentId] = { size: bytes, data };
    return {
      ...message,
      payload: {
        ...message.payload,
        // The generated message is single-part; once `parts` exists the mapper treats it as
        // multipart, so the plaintext body has to move into a part of its own.
        body: undefined,
        parts: [
          { mimeType: 'text/plain', body: message.payload.body! },
          { mimeType: 'application/octet-stream', filename: `${message.id}.bin`, body: { size: bytes, attachmentId } },
        ],
      },
    };
  });
  return { ...dataset, messages, attachments };
};

/** Peak `heapUsed` observed while `run` is in flight, sampled between macrotasks. */
const measurePeakHeap = async (run: () => Promise<unknown>) => {
  global.gc?.();
  const before = process.memoryUsage().heapUsed;
  let peak = before;
  const sampler = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().heapUsed);
  }, 5);
  try {
    await run();
  } finally {
    clearInterval(sampler);
  }
  return { before, peak, delta: peak - before };
};

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

describe.runIf(process.env.DX_MEM)('gmail sync attachment memory', () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  test('peak heap against attachment bytes', { timeout: 600_000 }, async ({ expect }) => {
    const end = subDays(new Date(), 3);
    const start = subDays(end, 9);
    const base = generateGmailDataset({ count: MESSAGE_COUNT, seed: 21, start, end });
    const dataset = withAttachments(base, ATTACHMENT_KB * 1024);
    const attachmentBytes = MESSAGE_COUNT * ATTACHMENT_KB * 1024;

    const { db, mailbox, binding } = await seedGmailBinding(builder);

    // `DX_MEM_BACKEND=1` stands in for blob-service: a default backend takes the bytes, so
    // `processAttachments` — which passes no `storage` — writes a URI instead of embedding the
    // payload, and the same run can be measured both ways.
    const store = new Map<string, Uint8Array>();
    const cleanup = process.env.DX_MEM_BACKEND
      ? db.graph.registerBlobBackend(
          'mem',
          {
            schemes: ['mem'],
            put: async ({ data, contentHash }) => {
              const uri = `mem:${contentHash}`;
              store.set(uri, data);
              return { uri };
            },
            get: async ({ uri }) => store.get(uri),
            has: async ({ uri }) => store.has(uri),
          },
          { default: true },
        )
      : undefined;

    const { before, peak, delta } = await measurePeakHeap(() =>
      EffectEx.runPromise(
        runGoogleSync({ binding: Ref.make(binding) }).pipe(Effect.provide(googleSyncTestServices(db, dataset))),
      ),
    );

    // Where the bytes actually landed: an `inline` blob embeds them in the Automerge document, so
    // every synced attachment permanently inflates the space doc that a later run has to open.
    const blobs = await db
      .query(Query.select(Filter.type(Blob.Blob)).from(Scope.feed(Feed.getFeedUri(mailbox.feed.target!)!)))
      .run();
    const inline = blobs.filter((blob) => blob.data._tag === 'inline').length;
    cleanup?.();
    const stored = [...store.values()].reduce((total, bytes) => total + bytes.byteLength, 0);

    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        `messages:          ${MESSAGE_COUNT}`,
        `attachment size:   ${ATTACHMENT_KB} KiB`,
        `attachment bytes:  ${mb(attachmentBytes)} MiB`,
        `heap before:       ${mb(before)} MiB`,
        `heap peak:         ${mb(peak)} MiB`,
        `heap delta:        ${mb(delta)} MiB`,
        `delta / payload:   ${(delta / attachmentBytes).toFixed(2)}x`,
        `blobs:             ${blobs.length} (${inline} inline, ${blobs.length - inline} external)`,
        `backend held:      ${mb(stored)} MiB in ${store.size} objects`,
        '',
      ].join('\n'),
    );

    expect(peak).toBeGreaterThan(before);
  });
});
