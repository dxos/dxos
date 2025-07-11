//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@dxos/react-ui';

import { Test } from './Test';
import * as stories from './Test.stories';

export const TEST_ID = 'test';

const { Default } = composeStories(stories);

/**
 * Vitest sanity test (should be visible in the storybook).
 * https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
 */
// TODO(burdon): Not working.
describe('Test', () => {
  it('should render', async () => {
    await Default.run();
    expect(screen.getByTestId(TEST_ID)).to.exist;
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
