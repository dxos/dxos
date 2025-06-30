//
// Copyright 2025 DXOS.org
//

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Test } from './Test';

// TODO(burdon): Error on rendering the story.
// TypeError: No existing state found for follower with id: 'storybook/test'
// TODO(burdon): Error on running the test.
// TypeError: Cannot send event before store is ready. You can get the current status with store.status

/**
 * Vitest sanity test (should be visible in the storybook).
 * https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
 */
describe('Test', () => {
  it('should render', () => {
    render(<Test icon='ph--x--regular' label='Test' />);
    expect(screen.getByRole('button', { name: 'Test' })).to.exist;
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Test icon='ph--x--regular' label='Test' onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.debug()).toMatchSnapshot();
  });
});
