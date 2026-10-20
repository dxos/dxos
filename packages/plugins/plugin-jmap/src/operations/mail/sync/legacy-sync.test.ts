//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { JmapOperationHandlerSet } from '#operations';
import { JmapOperation } from '#types';

describe('legacy JMAP sync key', () => {
  it.effect(
    'the handler set resolves the key persisted by per-binding sync Routines',
    Effect.fnUntraced(function* ({ expect }) {
      const handler = yield* OperationHandlerSet.getHandlerByKey(
        JmapOperationHandlerSet.handlers,
        'dxn:org.dxos.plugin.inbox.operation.jmapSync',
      );
      expect(handler.meta.key).toBe(JmapOperation.LegacyJmapSync.meta.key);
    }),
  );
});
