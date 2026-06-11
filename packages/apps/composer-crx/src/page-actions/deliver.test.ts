//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

// `deliver.ts` pulls in `invoke.ts` (and its `bridge/sender` import), which
// loads the polyfill at module scope; the tests below drive
// `deliverPickedSnapshot` through an injected `InvokeBridgeApi`, so an inert
// stand-in suffices (same pattern as `invoke.test.ts`).
vi.mock('webextension-polyfill', () => ({ default: {} }));

import { decodeDeliverPayload, deliverPickedSnapshot } from './deliver';
import { type InvokeBridgeApi } from './invoke';
import { type Snapshot } from './types';

const snapshot: Snapshot = {
  source: { url: 'https://example.com/a', title: 'Example', clippedAt: '2026-06-11T00:00:00.000Z' },
  selection: { text: 'Picked text.' },
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// Structurally narrow the invoke message captured by the mock; the request id
// is generated inside `deliverPickedSnapshot`, so acks must echo it back.
const getRequest = (message: unknown): Record<string, unknown> => {
  if (!isRecord(message) || !isRecord(message.request)) {
    throw new Error('malformed invoke message');
  }
  return message.request;
};

const getRequestId = (message: unknown): string => {
  const { id } = getRequest(message);
  if (typeof id !== 'string') {
    throw new Error('malformed request id');
  }
  return id;
};

describe('deliverPickedSnapshot', () => {
  test('builds a picker invoke request and returns the ack', async ({ expect }) => {
    const sent: unknown[] = [];
    const api: InvokeBridgeApi = {
      findComposerTab: async () => ({ id: 7 }),
      openComposerTab: async () => {},
      sendMessage: async (_tabId, message) => {
        sent.push(message);
        return { version: 1, id: getRequestId(message), ok: true, objectId: 'obj-1' };
      },
    };

    const ack = await deliverPickedSnapshot({ actionId: 'a-1', snapshot }, api);
    expect(ack).toMatchObject({ ok: true, objectId: 'obj-1' });

    const request = getRequest(sent[0]);
    expect(request.actionId).toBe('a-1');
    expect(request.invokedFrom).toBe('picker');
    expect(request.page).toMatchObject({ url: 'https://example.com/a', title: 'Example' });
    expect(request.inputs).toMatchObject({ selection: { text: 'Picked text.' } });
  });

  test('propagates delivery failure acks', async ({ expect }) => {
    const api: InvokeBridgeApi = {
      findComposerTab: async () => ({ id: 7 }),
      openComposerTab: async () => {},
      sendMessage: async (_tabId, message) => ({
        version: 1,
        id: getRequestId(message),
        ok: false,
        error: 'noSpace',
      }),
    };
    const ack = await deliverPickedSnapshot({ actionId: 'a-1', snapshot }, api);
    expect(ack).toMatchObject({ ok: false, error: 'noSpace' });
  });
});

describe('decodeDeliverPayload', () => {
  const validMsg = {
    type: 'composer-crx:page-action:deliver',
    actionId: 'a-1',
    snapshot: {
      source: { url: 'https://example.com/', title: 'Example', clippedAt: '2026-06-11T00:00:00.000Z' },
      selection: { text: 'hello', html: '<p>hello</p>', htmlTruncated: false },
      hints: { ogTitle: 'OG Title', ogDescription: 'desc', h1: 'Heading', firstImage: 'https://img.example.com/1.jpg' },
    },
  };

  test('accepts a valid full payload and preserves snapshot fields', ({ expect }) => {
    const result = decodeDeliverPayload(validMsg);
    expect(result).toBeDefined();
    expect(result!.actionId).toBe('a-1');
    expect(result!.snapshot.source.url).toBe('https://example.com/');
    expect(result!.snapshot.source.title).toBe('Example');
    expect(result!.snapshot.selection?.text).toBe('hello');
    expect(result!.snapshot.selection?.html).toBe('<p>hello</p>');
    expect(result!.snapshot.hints?.ogTitle).toBe('OG Title');
    expect(result!.snapshot.hints?.h1).toBe('Heading');
  });

  test('rejects when actionId is missing', ({ expect }) => {
    const { actionId: _removed, ...noActionId } = validMsg;
    expect(decodeDeliverPayload(noActionId)).toBeUndefined();
  });

  test('rejects when snapshot is missing', ({ expect }) => {
    const { snapshot: _removed, ...noSnapshot } = validMsg;
    expect(decodeDeliverPayload(noSnapshot)).toBeUndefined();
  });

  test('rejects when snapshot.source is missing', ({ expect }) => {
    const msg = { ...validMsg, snapshot: { selection: { text: 'x' } } };
    expect(decodeDeliverPayload(msg)).toBeUndefined();
  });

  test('rejects when source.url is missing', ({ expect }) => {
    const msg = {
      ...validMsg,
      snapshot: { source: { title: 'No URL', clippedAt: '2026-06-11T00:00:00.000Z' } },
    };
    expect(decodeDeliverPayload(msg)).toBeUndefined();
  });

  test('rejects when source.title is missing', ({ expect }) => {
    const msg = {
      ...validMsg,
      snapshot: { source: { url: 'https://example.com/', clippedAt: '2026-06-11T00:00:00.000Z' } },
    };
    expect(decodeDeliverPayload(msg)).toBeUndefined();
  });

  test('rejects a non-record value', ({ expect }) => {
    expect(decodeDeliverPayload(null)).toBeUndefined();
    expect(decodeDeliverPayload('string')).toBeUndefined();
    expect(decodeDeliverPayload(42)).toBeUndefined();
  });
});
