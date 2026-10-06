//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import * as AlertDialog from './AlertDialog.tsx';

describe('AlertDialog', () => {
  afterEach(() => {
    cleanup();
  });

  test('focus moving outside does not dismiss it', async () => {
    render(
      <>
        <button data-testid='outside'>outside</button>
        <AlertDialog.Root defaultOpen trapFocus={false}>
          <AlertDialog.Content>
            <AlertDialog.Title>Delete space?</AlertDialog.Title>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </>,
    );
    const dialog = await screen.findByRole('alertdialog');
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Cancel'));

    screen.getByTestId('outside').focus();
    expect(document.activeElement?.textContent).toBe('outside');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByRole('alertdialog')).toBe(dialog);
  });
});
