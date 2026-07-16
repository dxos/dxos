//
// Copyright 2026 DXOS.org
//

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, test } from 'vitest';

import { Highlighted } from './Highlighted';

describe('Highlighted', () => {
  test('wraps matched substrings in <mark>', () => {
    const { container } = render(<Highlighted text='Acme Invoice' query='invoice' />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('Invoice');
  });

  test('renders plain text when there is no match', () => {
    const { container } = render(<Highlighted text='nothing' query='xyz' />);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('nothing');
  });
});
