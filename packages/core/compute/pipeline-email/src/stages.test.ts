//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { EmailPipelineCtx, emptyStats, statsStage } from './stages';

describe('statsStage', () => {
  test('tallies senders and spam across the stream', async ({ expect }) => {
    const stats = emptyStats();
    // Test-only stub: statsStage never touches `db`.
    const ctx = Layer.succeed(EmailPipelineCtx, { db: {} as any, stats, summaries: [] });
    const messages = [
      Message.make({
        created: '2001-05-14T10:00:00.000Z',
        sender: { email: 'a@x.com' },
        blocks: [],
        properties: { spam: true },
      }),
      Message.make({ created: '2001-05-14T11:00:00.000Z', sender: { email: 'a@x.com' }, blocks: [] }),
    ];
    await EffectEx.runPromise(
      Stream.fromIterable(messages).pipe(statsStage, Pipeline.run({ sink: () => Effect.void }), Effect.provide(ctx)),
    );
    expect(stats.total).toBe(2);
    expect(stats.spam).toBe(1);
    expect(stats.from.get('a@x.com')).toBe(2);
  });
});
