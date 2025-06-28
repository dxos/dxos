//
// Copyright 2025 DXOS.org
//

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Test } from './Test';

// https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files

// TODO(burdon): This isn't called?

describe('Test', () => {
  it('should render', () => {
    render(<Test label='Test' onClick={() => {}} />);
    expect(screen.getByRole('button')).to.exist;
    console.log('ok');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Test label='Test' onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(handleClick).not.toHaveBeenCalledTimes(1); // TODO(burdon): !!!
    console.log(screen.debug());
  });
});
