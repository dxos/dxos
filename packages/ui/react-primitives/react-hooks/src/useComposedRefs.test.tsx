//
// Copyright 2026 DXOS.org
//

import { render } from '@testing-library/react';
import React, { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { composeRefs } from './useComposedRefs';

describe('composeRefs', () => {
  test('sets every ref and clears them on unmount', () => {
    const object = createRef<HTMLDivElement>();
    const callback = vi.fn();
    const { unmount } = render(<div ref={composeRefs(object, callback, undefined, null)} />);
    expect(object.current).toBeInstanceOf(HTMLDivElement);
    expect(callback).toHaveBeenCalledWith(object.current);
    unmount();
    expect(object.current).toBeNull();
    expect(callback).toHaveBeenLastCalledWith(null);
  });
});
