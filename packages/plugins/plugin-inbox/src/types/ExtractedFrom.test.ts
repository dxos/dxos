//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Relation } from '@dxos/echo';
import { Message } from '@dxos/types';

import * as ExtractedFrom from './ExtractedFrom';

describe('ExtractedFrom', () => {
  test('relation links extracted object to source Message', ({ expect }) => {
    const message = Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { email: 'noreply@united.com' },
      blocks: [],
    });
    const extracted = Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { email: 'system@dxos' },
      blocks: [],
    });

    const rel = ExtractedFrom.make({
      [Relation.Source]: extracted,
      [Relation.Target]: message,
      extractorId: 'trip-travel',
      extractedAt: new Date().toISOString(),
      confidence: 0.9,
    });

    expect(rel.extractorId).toBe('trip-travel');
    expect(Relation.getSource(rel).id).toBe(extracted.id);
    expect(Relation.getTarget(rel).id).toBe(message.id);
    // Verify the schema constant is exported.
    expect(ExtractedFrom.ExtractedFrom).toBeDefined();
  });
});
