//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { screen, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from './FieldEditor.stories';

const { Default } = composeStories(stories);

describe('FieldEditor', () => {
  afterEach(() => {
    cleanup();
  });

  test('update field type', async () => {
    await Default.run();

    expect(screen.getByText('Type format')).toBeInTheDocument();
    expect(screen.getByText('String')).toBeInTheDocument();

    {
      const debug = JSON.parse(screen.getByTestId('debug').textContent!);
      const name = debug.props.projection._schema.properties.name;
      expect(name.type).toBe('string');
      expect(name.description).toBe('Full name.');
    }

    fireEvent.click(screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    const option = options.find((option) => option.textContent === 'Number');
    fireEvent.click(option!);
    expect(screen.getByText('Number')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('save-button'));
    });

    {
      const debug = JSON.parse(screen.getByTestId('debug').textContent!);
      const name = debug.props.projection._schema.properties.name;
      expect(name.type).toBe('number');
      expect(name.format).toBe('number');
      expect(name.description).toBe('Full name.');
    }
  });
});
