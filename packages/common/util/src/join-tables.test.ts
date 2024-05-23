//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';
import { joinTables } from './join-tables';

describe('joinTables', () => {
  test('smoke', () => {
    const left = [
      { key: 1, name: 'A' },
      { key: 2, name: 'B' },
    ];

    const right = [
      { foreignKey: 1, value: 'X' },
      { foreignKey: 3, value: 'Y' },
    ];

    const result = joinTables('key', 'foreignKey', left, right);

    expect(result).to.deep.eq([
      { foreignKey: 1, value: 'X', key: 1, name: 'A' },
      { key: 2, name: 'B' },
      { foreignKey: 3, value: 'Y' },
    ]);
  });
});
