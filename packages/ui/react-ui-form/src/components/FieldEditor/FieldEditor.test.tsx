//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { screen, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { ProjectionModel } from '@dxos/schema';

import * as stories from './FieldEditor.stories';
import { type FieldEditorDebugObjects } from './FieldEditor.stories';
import { FIELD_EDITOR_DEBUG_SYMBOL } from '../testing';

const { Default } = composeStories(stories);

describe('FieldEditor', () => {
  afterEach(() => {
    cleanup();
  });

  test('update field type', async () => {
    await Default.run();

    expect(screen.getByText('Type format')).toBeInTheDocument();
    expect(screen.getByText('String')).toBeInTheDocument();

    // Verify the initial field shows as String type.
    expect(screen.getByText('String')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    const option = options.find((option) => option.textContent === 'Number');
    fireEvent.click(option!);
    expect(screen.getByText('Number')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('save-button'));
    });

    // Access the live objects directly from window using symbol.
    const debugObjects = getFieldEditorDebugObjects();

    const name = debugObjects.projection.baseSchema.properties!.name;
    expect(name.type).toBe('number');
    expect(name.format).toBe('number');
    expect(name.description).toBe('Full name.');
  });
});

const getFieldEditorDebugObjects = (): FieldEditorDebugObjects => {
  const debugObjects = (window as any)[FIELD_EDITOR_DEBUG_SYMBOL] as FieldEditorDebugObjects;
  expect(debugObjects).toBeDefined();
  expect(debugObjects.props).toBeInstanceOf(Object); // Props object
  expect(debugObjects.projection).toBeInstanceOf(ProjectionModel);
  return debugObjects;
};
