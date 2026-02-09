//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDocAccessor } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { applyDiffs } from './diff';

describe('diff', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  it('should apply diffs', async () => {
    const { db } = await builder.createDatabase({ types: [Text.Text] });

    const document = trim`
      # Hello World
      There'z a typo in this sentence.
      And another oon here.
      But not this one.
    `;

    const text = db.add(Text.make(document));
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

  it('should apply diffs that append content at the end', async () => {
    const { db } = await builder.createDatabase({ types: [Text.Text] });

    const document = '# Shopping list';

    const text = db.add(Text.make(document));
    const accessor = createDocAccessor(text, ['content']);
    const result = applyDiffs(accessor, ['- # Shopping list', '+ # Shopping list\n- Milk']);

    expect(result).toBe('# Shopping list\n- Milk');
  });

  it('should append text to an empty document', async () => {
    const builder = new EchoTestBuilder();
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([Text.Text]);

    const text = db.add(Text.make(''));
    const accessor = createDocAccessor(text, ['content']);
    const result = applyDiffs(accessor, ['+ # Shopping list']);

    expect(result).toBe('# Shopping list');
  });
});
