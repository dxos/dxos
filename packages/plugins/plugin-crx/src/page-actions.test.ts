//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { handleInvokeEvent, handleListEvent } from './page-actions';
import { PageAction } from './types';

const TestOp = Operation.make({
  meta: { key: DXN.make('org.dxos.test.operation.pageAction'), name: 'Test' },
  input: Schema.Struct({ snapshot: PageAction.Snapshot, target: Schema.Any }),
  output: Schema.Struct({ id: Schema.String }),
});

const action: PageAction.PageAction = {
  id: 'org.dxos.test/page-action/test',
  label: 'Test',
  icon: 'ph--bookmark-simple--regular',
  urlPatterns: ['https://*/*'],
  extractor: { name: 'snapshot' },
  contexts: ['popup'],
  operation: TestOp,
};

const snapshot = {
  source: { url: 'https://example.com', title: 'Example', clippedAt: '2026-06-09T00:00:00Z' },
};

const request = {
  version: 1,
  id: 'req-1',
  actionId: action.id,
  page: { url: 'https://example.com', title: 'Example' },
  inputs: snapshot,
  invokedFrom: 'popup',
};

const deps = (overrides: Partial<Parameters<typeof handleInvokeEvent>[1]> = {}) => ({
  getActions: () => [action],
  getTarget: () => ({}) as any, // Stub database; never dereferenced by the handler.
  invoke: async () => ({ data: { id: 'obj-1' }, error: undefined }),
  ...overrides,
});

describe('page-actions', () => {
  test('list returns serializable descriptors', ({ expect }) => {
    const ack = handleListEvent({ version: 1, id: 'list-1' }, () => [action]);
    expect(ack).toEqual({
      version: 1,
      id: 'list-1',
      ok: true,
      actions: [{ ...action, operation: TestOp.meta.key.toString() }],
    });
  });

  test('list rejects malformed request', ({ expect }) => {
    const ack = handleListEvent({ nope: true }, () => [action]);
    expect(ack.ok).toBe(false);
  });

  test('invoke happy path returns objectId', async ({ expect }) => {
    const ack = await handleInvokeEvent(request, deps());
    expect(ack).toEqual({ version: 1, id: 'req-1', ok: true, objectId: 'obj-1' });
  });

  test('invoke rejects unsupported version', async ({ expect }) => {
    const ack = await handleInvokeEvent({ ...request, version: 2 }, deps());
    expect(ack).toMatchObject({ ok: false, error: 'unsupportedVersion' });
  });

  test('invoke rejects unknown action', async ({ expect }) => {
    const ack = await handleInvokeEvent({ ...request, actionId: 'nope' }, deps());
    expect(ack).toMatchObject({ ok: false, error: 'unknownAction' });
  });

  test('invoke maps missing space to noSpace', async ({ expect }) => {
    const ack = await handleInvokeEvent(request, deps({ getTarget: () => undefined }));
    expect(ack).toMatchObject({ ok: false, error: 'noSpace' });
  });

  test('invoke maps operation error to operationFailed', async ({ expect }) => {
    const ack = await handleInvokeEvent(
      request,
      deps({ invoke: async () => ({ data: undefined, error: new Error('boom') }) }),
    );
    expect(ack).toMatchObject({ ok: false, error: 'operationFailed' });
  });
});
