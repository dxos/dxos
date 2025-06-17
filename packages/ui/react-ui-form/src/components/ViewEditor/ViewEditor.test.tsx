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

  test('add new property', async () => {
    await Default.run();
    await waitForViewEditor();

    // Click the add property button
    const addButton = screen.getByText('Add property');
    fireEvent.click(addButton);

    // Fill out the property field
    const fieldInput = screen.getByPlaceholderText('Field name.');
    fireEvent.change(fieldInput, { target: { value: 'added_property' } });

    // Click the format combo box and select the first option
    const formatCombo = screen.getByRole('combobox');
    fireEvent.click(formatCombo);

    const firstOption = screen.getAllByRole('option')[0];
    fireEvent.click(firstOption);

    // Save the changes
    fireEvent.click(screen.getByTestId('save-button'));

    // Assert the new property exists
    expect(screen.getByText('added_property')).toBeInTheDocument();

    const debugInfo = JSON.parse(screen.getByTestId('debug').textContent!);

    // Check schema contains added_property
    const schemaProperties = debugInfo.schema._storedSchema.jsonSchema.properties;
    expect(schemaProperties.added_property).toBeDefined();

    // Check view contains added_property field
    const addedPropertyField = debugInfo.view.fields.find((field: any) => field.path === 'added_property');
    expect(addedPropertyField).toBeDefined();
    expect(addedPropertyField.path).toBe('added_property');

    // Check projection contains added_property
    const addedPropertyProjection = debugInfo.projection._fieldProjections.find(
      (proj: any) => proj.field.path === 'added_property',
    );
    expect(addedPropertyProjection).toBeDefined();
    expect(addedPropertyProjection.props.property).toBe('added_property');
  });

  test('delete property', async () => {
    await Default.run();
    await waitForViewEditor();

    // Find the delete button for the 'name' property
    const nameProperty = screen.getByText('name');
    const propertyRow = nameProperty.closest('[role="listitem"]');
    const deleteButton = propertyRow?.querySelector('button:last-child');

    if (!deleteButton) {
      throw new Error('Delete button not found');
    }

    // Click the delete button
    fireEvent.click(deleteButton);

    // Assert the property is no longer visible
    expect(screen.queryByText('name')).not.toBeInTheDocument();

    const debugInfo = JSON.parse(screen.getByTestId('debug').textContent!);

    // Check schema no longer contains the name property
    const schemaProperties = debugInfo.schema._storedSchema.jsonSchema.properties;
    expect(schemaProperties.name).toBeUndefined();

    // Check view no longer contains the name field
    const nameField = debugInfo.view.fields.find((field: any) => field.path === 'name');
    expect(nameField).toBeUndefined();

    // Check projection no longer contains the name property
    const nameProjection = debugInfo.projection._fieldProjections.find((proj: any) => proj.field.path === 'name');
    expect(nameProjection).toBeUndefined();
  });

  test('hide and show property', async () => {
    await Default.run();
    await waitForViewEditor();

    // Click the first hide button
    const hideButtons = screen.getAllByTestId('hide-field-button');
    fireEvent.click(hideButtons[0]);

    // Check that hiddenFields is non-empty
    let debugInfo = JSON.parse(screen.getByTestId('debug').textContent!);
    expect(debugInfo.view.hiddenFields.length).toBeGreaterThan(0);

    // Wait for the show button to appear and click it
    await waitFor(() => {
      expect(screen.getByTestId('show-field-button')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('show-field-button'));

    // Check that hiddenFields is empty again
    debugInfo = JSON.parse(screen.getByTestId('debug').textContent!);
    expect(debugInfo.view.hiddenFields.length).toBe(0);
  });
});
