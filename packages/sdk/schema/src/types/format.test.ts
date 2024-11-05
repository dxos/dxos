//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { AST, ScalarEnum, FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { getSchema, type BaseProperty } from './format';

describe('format', () => {
  test('get fields for format', async ({ expect }) => {
    const prop: BaseProperty = {
      format: FormatEnum.Currency,
      type: ScalarEnum.Number,
      property: 'salary',
      title: 'Base salary',
    };

    console.log('>>>>', (FormatEnum as any).Currency);

    const schema = getSchema(prop);
    invariant(schema);
    expect(AST.getPropertySignatures(schema.ast)).to.have.length(7);
  });
});
