//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { createDocAccessor } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { applyDiffs } from './diff';

describe('diff', () => {
  it('should apply diffs', async () => {
    const builder = new EchoTestBuilder();
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.addSchema([DataType.Text.Text]);

    const document = trim`
      # Hello World
      There'z a typo in this sentence.
      And another oon here.
      But not this one.
    `;

    const text = db.add(DataType.Text.make(document));
    const accessor = createDocAccessor(text, ['content']);
    const result = applyDiffs(accessor, [
      `- There'z a typo in this sentence.`,
      `+ There is a typo in this sentence.`,
      `- And another oon here.`,
      `+ And another one here.`,
    ]);

    expect(result).toBe(trim`
      # Hello World
      There is a typo in this sentence.
      And another one here.
      But not this one.
    `);
  });
});
