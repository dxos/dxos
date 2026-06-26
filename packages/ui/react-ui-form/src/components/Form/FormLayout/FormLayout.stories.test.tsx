//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react';
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from './FormLayout.stories';

const { NestedLabel, NestedLabelStatic } = composeStories(stories);

describe('FormLayout — nested fields', () => {
  afterEach(async () => {
    // Flush pending React scheduler work before teardown to prevent
    // "window is not defined" errors from setImmediate callbacks firing after happy-dom cleanup.
    await act(async () => {});
    cleanup();
  });

  test('renders nested struct labels and dotted sub-fields', { timeout: 30_000 }, async () => {
    await NestedLabel.run();

    // `<field name="origin"/>` / `<field name="destination"/>` auto-convert to the
    // place's `LabelAnnotation` label (the `name` field), rendered as read-only text.
    // `findByText` retries while the async client provider initializes.
    expect(await screen.findByText('John F. Kennedy Intl')).toBeInTheDocument();
    expect(await screen.findByText('Charles de Gaulle')).toBeInTheDocument();

    // `<field name="origin.code"/>` / `<field name="destination.code"/>` drill into the
    // leaf sub-field, rendered as editable inputs holding the code.
    expect(await screen.findByDisplayValue('JFK')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('CDG')).toBeInTheDocument();
  });

  test('static layout formats dates and renders labels as read-only text', { timeout: 30_000 }, async () => {
    await NestedLabelStatic.run();

    // Scope assertions to the form: the debug panel echoes the raw values JSON.
    const form = await screen.findByRole('form');

    // The depart date renders human-readable (contains the year) rather than the raw ISO
    // string. Match `2026` and assert no ISO time fragment leaks through — timezone-robust.
    expect(within(form).getByText(/2026/)).toBeInTheDocument();
    expect(within(form).queryByText(/T\d\d:\d\d/)).toBeNull();

    // Nested struct labels and dotted sub-fields render as static text (not inputs).
    expect(within(form).getByText('John F. Kennedy Intl')).toBeInTheDocument();
    expect(within(form).getByText('JFK')).toBeInTheDocument();
  });
});
