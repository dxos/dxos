//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { defer, deferAsync } from './defer';

describe('defer', () => {
  test('defer', () => {
    const events: string[] = [];

    {
      using _ = defer(() => events.push('1'));
      events.push('2');
    }

    expect(events).to.deep.eq(['2', '1']);
  });

  test('deferAsync', async () => {
    const events: string[] = [];

    {
      await using _ = deferAsync(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        events.push('1');
      });
      events.push('2');
    }
    events.push('3');

    expect(events).to.deep.eq(['2', '1', '3']);
  });
});
