//
// Copyright 2026 DXOS.org
//

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, test, vi } from 'vitest';

import { ThemeProvider, Tooltip, defaultTx } from '@dxos/react-ui';

import { translations } from '#translations';

import { FormFieldLabel } from './FormRow';

// The affordance's `Icon` needs a theme and its trigger needs a `Tooltip.Provider`; zero delay so the
// hover assertion doesn't wait out the default open delay.
const Wrapper = ({ children }: PropsWithChildren) => (
  <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
    <Tooltip.Provider delayDuration={0}>{children}</Tooltip.Provider>
  </ThemeProvider>
);

describe('FormFieldLabel', () => {
  afterEach(() => {
    cleanup();
  });

  test('surfaces a description as a tooltip on an info affordance beside the label', async ({ expect }) => {
    render(<FormFieldLabel standalone label='Name' description='The full legal name.' />, { wrapper: Wrapper });

    // The affordance is a sibling of the label, so the label's text stays exactly `label` and fields
    // remain locatable by their exact label text; the description is hidden until hovered.
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.queryByText('The full legal name.')).toBeNull();

    const trigger = screen.getByRole('button', { name: 'Description' });
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('The full legal name.'));
  });

  test('clicking the affordance does not trigger the label row (e.g. a collapse toggle)', ({ expect }) => {
    const onClick = vi.fn();
    render(<FormFieldLabel standalone label='Address' description='Where they live.' onClick={onClick} />, {
      wrapper: Wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Description' }));
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Address'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('omits the affordance when the field has no description', ({ expect }) => {
    render(<FormFieldLabel standalone label='Name' />, { wrapper: Wrapper });

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
