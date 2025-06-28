//
// Copyright 2025 DXOS.org
//

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Test } from './Test';

// TODO(burdon): Test should be visible in the storybook (via addon-vitest).
// https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
// TypeError: No existing state found for follower with id: 'storybook/test'
// TypeError: Cannot send event before store is ready. You can get the current status with store.status

describe('Test', () => {
  it('should render', () => {
    render(<Test label='Test' onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Test' })).to.exist;
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Test label='Test' onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.debug()).toMatchSnapshot();
  });
});
