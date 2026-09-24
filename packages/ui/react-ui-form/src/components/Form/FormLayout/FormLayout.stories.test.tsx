//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react-vite';
import { act, cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from './FormLayout.stories.tsx';

const { NestedLabel, NestedLabelStatic } = composeStories(stories);

// `withClientProvider` renders nothing until the client has created its identity and first space —
// measured at ~1.8s here, past testing-library's 1s `findBy*` default. Waiting for the form once
// covers it: `Form.Content` renders `role="form"` with the fields as its children, so the whole
// form lands in a single commit and every assertion after the wait can be synchronous.
const CLIENT_READY_TIMEOUT = 10_000;

describe('FormLayout — nested fields', () => {
  afterEach(async () => {
    // Flush pending React scheduler work before teardown to prevent
    // "window is not defined" errors from setImmediate callbacks firing after happy-dom cleanup.
    await act(async () => {});
    cleanup();
  });

  test('renders nested struct labels and dotted sub-fields', { timeout: 30_000 }, async () => {
    await NestedLabel.run();
    const form = await screen.findByRole('form', undefined, { timeout: CLIENT_READY_TIMEOUT });

    // `<field name="origin"/>` / `<field name="destination"/>` auto-convert to the
    // place's `LabelAnnotation` label (the `name` field), rendered as read-only text.
    expect(within(form).getByText('John F. Kennedy Intl')).toBeInTheDocument();
    expect(within(form).getByText('Charles de Gaulle')).toBeInTheDocument();

    // `<field name="origin.code"/>` / `<field name="destination.code"/>` drill into the
    // leaf sub-field, rendered as editable inputs holding the code.
    expect(within(form).getByDisplayValue('JFK')).toBeInTheDocument();
    expect(within(form).getByDisplayValue('CDG')).toBeInTheDocument();
  });

  test('static layout formats dates and renders labels as read-only text', { timeout: 30_000 }, async () => {
    await NestedLabelStatic.run();

    // Scope assertions to the form: the debug panel echoes the raw values JSON.
    const form = await screen.findByRole('form', undefined, { timeout: CLIENT_READY_TIMEOUT });

    // The depart date renders human-readable (contains the year) rather than the raw ISO
    // string. Match `2026` and assert no ISO time fragment leaks through — timezone-robust.
    expect(within(form).getByText(/2026/)).toBeInTheDocument();
    expect(within(form).queryByText(/T\d\d:\d\d/)).toBeNull();

    // Nested struct labels and dotted sub-fields render as static text (not inputs).
    expect(within(form).getByText('John F. Kennedy Intl')).toBeInTheDocument();
    expect(within(form).getByText('JFK')).toBeInTheDocument();
  });
});
