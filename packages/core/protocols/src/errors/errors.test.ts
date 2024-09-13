//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { ApiError } from './base-errors';

describe('Errors', () => {
  test('test', async () => {
    const runTest = async () => {
      throw new ApiError('Test error');
    };

    await expect(runTest()).rejects.toThrowError('Test error');
  });
});
