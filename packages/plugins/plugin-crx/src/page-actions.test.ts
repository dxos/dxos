//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { Message, request } from '@dxos/crx-protocol';
import { createMockPeer } from '@dxos/crx-protocol/testing';
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

const invokeRequest = {
  version: 1,
  id: 'req-1',
  actionId: action.id,
  page: { url: 'https://example.com', title: 'Example' },
  inputs: snapshot,
  invokedFrom: 'popup',
};

const deps = (overrides: Partial<Parameters<typeof handleInvokeEvent>[1]> = {}) => ({
  getActions: () => [action],
  getSettings: () => ({}),
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
    const ack = await handleInvokeEvent(invokeRequest, deps());
    expect(ack).toEqual({ version: 1, id: 'req-1', ok: true, objectId: 'obj-1' });
  });

  test('invoke is ignored when extension actions are disabled', async ({ expect }) => {
    let invoked = false;
    const ack = await handleInvokeEvent(
      invokeRequest,
      deps({
        getSettings: () => ({ enabled: false }),
        invoke: async () => {
          invoked = true;
          return { data: { id: 'obj-1' }, error: undefined };
        },
      }),
    );
    expect(ack).toEqual({ version: 1, id: 'req-1', ok: false, error: 'disabled' });
    expect(invoked).toBe(false);
  });

  test('invoke honors an explicit enabled=true', async ({ expect }) => {
    const ack = await handleInvokeEvent(invokeRequest, deps({ getSettings: () => ({ enabled: true }) }));
    expect(ack).toMatchObject({ ok: true, objectId: 'obj-1' });
  });

  test('invoke rejects unsupported version', async ({ expect }) => {
    const ack = await handleInvokeEvent({ ...invokeRequest, version: 2 }, deps());
    expect(ack).toMatchObject({ ok: false, error: 'unsupportedVersion' });
  });

  test('invoke rejects unknown action', async ({ expect }) => {
    const ack = await handleInvokeEvent({ ...invokeRequest, actionId: 'nope' }, deps());
    expect(ack).toMatchObject({ ok: false, error: 'unknownAction' });
  });

  test('invoke maps missing space to noSpace', async ({ expect }) => {
    const ack = await handleInvokeEvent(invokeRequest, deps({ getTarget: () => undefined }));
    expect(ack).toMatchObject({ ok: false, error: 'noSpace' });
  });

  test('invoke maps operation error to operationFailed', async ({ expect }) => {
    const ack = await handleInvokeEvent(
      invokeRequest,
      deps({ invoke: async () => ({ data: undefined, error: new Error('boom') }) }),
    );
    expect(ack).toMatchObject({ ok: false, error: 'operationFailed' });
  });

  test('invoke echoes request id when payload is invalid', async ({ expect }) => {
    const { page: _page, ...withoutPage } = invokeRequest;
    const ack = await handleInvokeEvent(withoutPage, deps());
    expect(ack).toEqual({ version: 1, id: 'req-1', ok: false, error: 'invalidPayload' });
  });

  test('invoke maps a rejecting operation to operationFailed', async ({ expect }) => {
    const ack = await handleInvokeEvent(
      invokeRequest,
      deps({
        invoke: async () => {
          throw new Error('boom');
        },
      }),
    );
    expect(ack).toMatchObject({ ok: false, error: 'operationFailed' });
  });

  test('invoke accepts picker-originated requests', async ({ expect }) => {
    const ack = await handleInvokeEvent({ ...invokeRequest, invokedFrom: 'picker' }, deps());
    expect(ack).toEqual({ version: 1, id: 'req-1', ok: true, objectId: 'obj-1' });
  });

  test('list serializes picker contexts', ({ expect }) => {
    const pickerAction: PageAction.PageAction = { ...action, contexts: ['picker'] };
    const ack = handleListEvent({ version: 1, id: 'list-2' }, () => [pickerAction]);
    expect(ack.ok).toBe(true);
    expect(ack.ok && ack.actions[0].contexts).toEqual(['picker']);
  });
});

describe('page-actions over the mock protocol peer', () => {
  test('a list request is answered by the real handler', async ({ expect }) => {
    const { extension, composer } = createMockPeer();
    composer.handle((message) => {
      if (message._tag === 'page-actions.list') {
        const ack = handleListEvent({ version: 1, id: message.id }, () => []);
        return ack.ok
          ? Message.make('page-actions.list-ack', { id: ack.id, ok: true, actions: ack.actions })
          : Message.make('page-actions.list-ack', { id: ack.id, ok: false, error: ack.error });
      }
    });
    const reply = await request(extension, Message.make('page-actions.list', { id: 'r1' }));
    expect(reply).toMatchObject({ _tag: 'page-actions.list-ack', id: 'r1', ok: true });
  });
});
