//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react-vite';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from '../Form.stories';

const { Default } = composeStories(stories);

describe('FormFieldSet', () => {
  afterEach(async () => {
    // Flush pending React scheduler work before teardown to prevent
    // "window is not defined" errors from setImmediate callbacks firing after happy-dom cleanup.
    await act(async () => {});
    cleanup();
  });

  test('a nested object folds under its own header', async () => {
    await Default.run();

    // The header is the disclosure: a button that names the group and announces its state.
    const trigger = await screen.findByRole('button', { name: 'Address' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const content = document.getElementById(trigger.getAttribute('aria-controls')!)!;
    expect(content).not.toHaveAttribute('hidden');
    expect(content.querySelectorAll('input').length).toBeGreaterThan(0);

    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    await waitFor(() => expect(content).toHaveAttribute('hidden'));

    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(content).not.toHaveAttribute('hidden'));
  });
});
