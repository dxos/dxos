//
// Copyright 2025 DXOS.org
//

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@dxos/react-ui';

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
    const { container } = render(
      <ThemeProvider>
        <Test id='test' icon='ph--x--regular' label='Test' />
      </ThemeProvider>,
    );

    expect(container.querySelector('#test')).to.exist;
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <Test id='test' icon='ph--x--regular' label='Test' onClick={handleClick} />
      </ThemeProvider>,
    );

    fireEvent.click(container.querySelector('#test')!);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.debug()).toMatchSnapshot();
  });
});
