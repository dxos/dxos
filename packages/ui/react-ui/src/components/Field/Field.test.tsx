//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, beforeAll, describe, test, vi } from 'vitest';

import { ThemeProvider } from '../../providers';
import { defaultTx } from '../../theme';
import { Field } from './Field';

const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider tx={defaultTx}>{children}</ThemeProvider>;

/**
 * The field owns the wiring between the label, the control and the texts; these pin the contract the
 * parts kept across the move from the hand-rolled primitive: the row under a valid control describes
 * it as a whole, and once invalid the description alone does while the validation is the error.
 */
describe('Input', () => {
  beforeAll(() => {
    // The icon registry fetches glyphs the static sprite lacks; nothing serves them here.
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
  });

  afterEach(() => {
    cleanup();
  });

  test('a valid field is described by its whole meta row', async ({ expect }) => {
    render(
      <Field.Root>
        <Field.Label>Name</Field.Label>
        <Field.Input />
        <Field.HelperText>Your full name.</Field.HelperText>
      </Field.Root>,
      { wrapper: Wrapper },
    );

    const input = screen.getByLabelText('Name');
    await waitFor(() => expect(input.getAttribute('aria-describedby')).toBeTruthy());
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Your full name.');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-errormessage')).toBeNull();
  });

  test('an invalid field names its error and is described by the description alone', async ({ expect }) => {
    render(
      <Field.Root validationValence='error' required>
        <Field.Label>Name</Field.Label>
        <Field.Input />
        <Field.ErrorText>Required.</Field.ErrorText>
        <Field.HelperText>Your full name.</Field.HelperText>
      </Field.Root>,
      { wrapper: Wrapper },
    );

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.required).toBe(true);
    await waitFor(() => expect(input.getAttribute('aria-describedby')).toBeTruthy());
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Your full name.');
    const error = screen.getByText('Required.');
    await waitFor(() => expect(input.getAttribute('aria-errormessage')).toBe(error.id));
    expect(error.getAttribute('aria-live')).toBe('polite');
  });

  test('a checkbox and a switch take the field id the label points at', ({ expect }) => {
    render(
      <>
        <Field.Root>
          <Field.Checkbox />
          <Field.Label>Agree</Field.Label>
        </Field.Root>
        <Field.Root>
          <Field.Switch />
          <Field.Label>Notify</Field.Label>
        </Field.Root>
      </>,
      { wrapper: Wrapper },
    );

    const [checkbox, toggle] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(screen.getByText('Agree').getAttribute('for')).toBe(checkbox.id);
    expect(screen.getByText('Notify').getAttribute('for')).toBe(toggle.id);
  });
});
