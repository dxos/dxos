//
// Copyright 2025 DXOS.org
//

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { Test } from './Test.tsx';

/**
 * Vitest sanity test (should be visible in the storybook).
 * https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
 */
describe('Test', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ThemeProvider.ThemeProvider>
        <Test id='test' icon='ph--x--regular' label='Test' onClick={handleClick} />
      </ThemeProvider.ThemeProvider>,
    );

    fireEvent.click(container.querySelector('#test')!);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.debug()).toMatchSnapshot();
  });
});
