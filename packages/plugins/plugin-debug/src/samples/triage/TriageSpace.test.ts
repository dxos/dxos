//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as TriageSpace from './TriageSpace.ts';

describe('Inbox triage template', () => {
  test('builds an archive with the inbox and its sample mail account', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(TriageSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.mailbox')).toBe(1);
    expect(countOf('type.message')).toBe(TriageSpace.EMAIL_SEEDS.length);
    expect(countOf('type.connection')).toBe(1);
  });
});
