//
// Copyright 2025 DXOS.org
//

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Test } from './Test';

/**
 * Vitest sanity test (should be visible in the storybook).
 * https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
 */
// TODO(burdon): Not working.
describe.skip('Test', () => {
  it('should render', () => {
    const { container } = render(<Test id='test' icon='ph--x--regular' label='Test' />);

    expect(container.querySelector('#test')).not.to.exist;
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(<Test id='test' icon='ph--x--regular' label='Test' onClick={handleClick} />);

    fireEvent.click(container.querySelector('#test')!);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.debug()).toMatchSnapshot();
  });
});
