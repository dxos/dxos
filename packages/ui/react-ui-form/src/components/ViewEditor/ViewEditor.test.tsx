//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import * as stories from './ViewEditor.stories';

const { Default } = composeStories(stories);

const waitForViewEditor = async () => {
  await waitFor(() => {
    expect(screen.getByTestId('debug')).toBeInTheDocument();
  });
};

describe('ViewEditor', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders view editor', async () => {
    await Default.run();
    await waitForViewEditor();
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  test('change property name', async () => {
    // Arrange.
    await Default.run();
    await waitForViewEditor();

    // Act.
    const nameField = screen.getByText('name');
    fireEvent.click(nameField);

    const fieldInput = screen.getByPlaceholderText('Field name.');
    fireEvent.change(fieldInput, { target: { value: 'new_property' } });

    fireEvent.click(screen.getByTestId('save-button'));

    // Assert.
    expect(screen.getByText('new_property')).toBeInTheDocument();

    const debugInfo = JSON.parse(screen.getByTestId('debug').textContent!);

    // Check schema contains new_property.
    const schemaProperties = debugInfo.schema._storedSchema.jsonSchema.properties;
    expect(schemaProperties.new_property).toBeDefined();

    // Check view contains new_property field.
    const newPropertyField = debugInfo.view.fields.find((field: any) => field.path === 'new_property');
    expect(newPropertyField).toBeDefined();
    expect(newPropertyField.path).toBe('new_property');

    // Check projection contains new_property.
    const newPropertyProjection = debugInfo.projection._fieldProjections.find(
      (proj: any) => proj.field.path === 'new_property',
    );
    expect(newPropertyProjection).toBeDefined();
    expect(newPropertyProjection.props.property).toBe('new_property');
  });
});
