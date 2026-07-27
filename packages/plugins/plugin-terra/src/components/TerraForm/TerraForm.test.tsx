//
// Copyright 2026 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { ThemeProvider } from '@dxos/react-ui';

import { Terra } from '#types';

import { TerraForm } from './TerraForm';

// `Form.Row`'s label/status chrome and the `Slider` primitive read theme tokens via `useThemeContext`.
const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider>{children}</ThemeProvider>;

const config: Terra.TerraConfig = {
  seed: 'terra-1',
  waterLevel: 0.46,
  elevationScale: 0.16,
  mountainScale: 0.5,
  treeDensity: 0.28,
  resolution: 256,
};

describe('TerraForm', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the five slider fields without tripping the Form field-error boundary', () => {
    render(<TerraForm config={config} onChange={() => {}} />, { wrapper: Wrapper });

    // Regression test for the `Input` must be used within `Input` runtime error: the custom
    // slider field renderer originally rendered `Form.Label` directly instead of going through
    // `Form.Row`'s field-mode render-prop, so it never got `Form.Row`'s `Input.Root` wrapper —
    // every slider field was swallowed by `FormFieldErrorBoundary` and replaced with a red
    // "ERROR" row instead of throwing (a render-time context failure invisible to build/lint/test).
    expect(screen.queryByText('ERROR')).toBeNull();

    // waterLevel, elevationScale, mountainScale, treeDensity, resolution.
    expect(screen.getAllByRole('slider')).toHaveLength(5);
  });

  test('shows a human label and a live readout, as siblings, on the label line', () => {
    render(<TerraForm config={config} onChange={() => {}} />, { wrapper: Wrapper });

    // Human `title` annotations on `Terra.TerraConfig`, not raw property names ("waterLevel").
    const label = screen.getByText('Water level');
    // Exact textContent match enforces the sibling constraint: `labelEnd`'s readout must never be
    // nested inside `Input.Label`, or the label's accessible name would churn on every slider drag.
    expect(label.textContent).toBe('Water level');
    // `getByText` throws if no match is found, which is assertion enough that the readout rendered.
    expect(screen.getByText('0.46')).toBeTruthy();

    // `Input.Label`'s `htmlFor` cannot reach the slider thumb (it isn't a labelable form control),
    // so the thumb needs its own accessible name via `thumbLabels`.
    expect(screen.getByRole('slider', { name: 'Water level' })).toBeTruthy();
  });
});
