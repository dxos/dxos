//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from './FormLayout.stories';

const { NestedLabel } = composeStories(stories);

describe('FormLayout — nested fields', () => {
  afterEach(() => {
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
});
