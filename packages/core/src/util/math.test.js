//
// Copyright 2020 DxOS.org
//

import { fraction, multiply } from './math';

// TODO(burdon): Test grid.

test('fractions', () => {
  {
    const v1 = fraction(1);
    const v2 = fraction(1);
    const [num, denom] = multiply(v1, v2);
    expect(num).toBe(1);
    expect(denom).toBe(1);
  }

  {
    const v1 = fraction(1, 2);
    const v2 = fraction(2, 3);
    const [num, denom, value] = multiply(v1, v2);
    expect(num).toBe(2);
    expect(denom).toBe(6);
    expect(value).toBe(2 / 6);
  }
});
