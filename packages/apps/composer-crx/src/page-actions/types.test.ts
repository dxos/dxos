//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type InvokeAck,
  type ListAck,
  type PageActionDescriptor,
  decodeDescriptor,
  decodeInvokeAck,
  decodeListAck,
} from './types';

const fullDescriptor: PageActionDescriptor = {
  id: 'youtube-clip',
  label: 'Clip video',
  icon: 'ph--video--regular',
  urlPatterns: ['https://*.youtube.com/watch*'],
  predicate: { exists: 'video' },
  extractor: { name: 'snapshot', params: { maxHtmlBytes: 1024 } },
  contexts: ['popup', 'page'],
  operation: 'dxos.org/operation/clip-video',
};

const minimalDescriptor: PageActionDescriptor = {
  id: 'snapshot',
  label: 'Save page',
  icon: 'ph--camera--regular',
  urlPatterns: ['<all_urls>'],
  extractor: { name: 'snapshot' },
  contexts: ['popup'],
  operation: 'dxos.org/operation/save-page',
};

describe('page-actions types', () => {
  test('decodeDescriptor round-trips a full descriptor', ({ expect }) => {
    expect(decodeDescriptor(fullDescriptor)).toEqual(fullDescriptor);
  });

  test('decodeDescriptor round-trips a minimal descriptor', ({ expect }) => {
    expect(decodeDescriptor(minimalDescriptor)).toEqual(minimalDescriptor);
  });

  test('decodeDescriptor rejects missing required fields', ({ expect }) => {
    const { id: _id, ...withoutId } = fullDescriptor;
    expect(decodeDescriptor(withoutId)).toBeUndefined();
    const { label: _label, ...withoutLabel } = fullDescriptor;
    expect(decodeDescriptor(withoutLabel)).toBeUndefined();
    const { icon: _icon, ...withoutIcon } = fullDescriptor;
    expect(decodeDescriptor(withoutIcon)).toBeUndefined();
  });

  test('decodeDescriptor rejects non-array urlPatterns', ({ expect }) => {
    expect(decodeDescriptor({ ...fullDescriptor, urlPatterns: '<all_urls>' })).toBeUndefined();
    expect(decodeDescriptor({ ...fullDescriptor, urlPatterns: [1, 2] })).toBeUndefined();
  });

  test('decodeDescriptor rejects an extractor without a name', ({ expect }) => {
    expect(decodeDescriptor({ ...fullDescriptor, extractor: {} })).toBeUndefined();
    expect(decodeDescriptor({ ...fullDescriptor, extractor: { name: 1 } })).toBeUndefined();
  });

  test('decodeDescriptor filters unknown contexts values', ({ expect }) => {
    const decoded = decodeDescriptor({ ...minimalDescriptor, contexts: ['popup', 'sidebar'] });
    expect(decoded).toEqual({ ...minimalDescriptor, contexts: ['popup'] });
  });

  test('decodeDescriptor tolerates unknown extra fields', ({ expect }) => {
    expect(decodeDescriptor({ ...minimalDescriptor, junk: true })).toEqual(minimalDescriptor);
  });

  test('decodeListAck round-trips an ok ack', ({ expect }) => {
    const ack: ListAck = { version: 1, id: 'abc', ok: true, actions: [fullDescriptor, minimalDescriptor] };
    expect(decodeListAck(ack)).toEqual(ack);
  });

  test('decodeListAck drops invalid descriptors instead of failing the ack', ({ expect }) => {
    const ack = { version: 1, id: 'abc', ok: true, actions: [fullDescriptor, { id: 'broken' }] };
    expect(decodeListAck(ack)).toEqual({ version: 1, id: 'abc', ok: true, actions: [fullDescriptor] });
  });

  test('decodeListAck round-trips an error ack', ({ expect }) => {
    const ack: ListAck = { version: 1, id: 'abc', ok: false, error: 'noSpace' };
    expect(decodeListAck(ack)).toEqual(ack);
  });

  test('decodeListAck rejects a version mismatch', ({ expect }) => {
    expect(decodeListAck({ version: 2, id: 'abc', ok: true, actions: [] })).toBeUndefined();
  });

  test('decodeListAck rejects a missing id', ({ expect }) => {
    expect(decodeListAck({ version: 1, ok: true, actions: [] })).toBeUndefined();
  });

  test('decodeInvokeAck round-trips an ok ack with and without objectId', ({ expect }) => {
    const withObjectId: InvokeAck = { version: 1, id: 'abc', ok: true, objectId: 'obj-1' };
    expect(decodeInvokeAck(withObjectId)).toEqual(withObjectId);
    const withoutObjectId: InvokeAck = { version: 1, id: 'abc', ok: true };
    expect(decodeInvokeAck(withoutObjectId)).toEqual(withoutObjectId);
  });

  test('decodeInvokeAck round-trips an error ack', ({ expect }) => {
    const ack: InvokeAck = { version: 1, id: 'abc', ok: false, error: 'operationFailed' };
    expect(decodeInvokeAck(ack)).toEqual(ack);
  });

  test('decodeInvokeAck rejects a non-boolean ok', ({ expect }) => {
    expect(decodeInvokeAck({ version: 1, id: 'abc', ok: 'yes' })).toBeUndefined();
  });

  test('decodeInvokeAck rejects a version mismatch', ({ expect }) => {
    expect(decodeInvokeAck({ version: 2, id: 'abc', ok: true })).toBeUndefined();
  });
});
