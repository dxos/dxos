//
// Copyright 2025 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { EchoSchema, isInstanceOf } from '@dxos/echo/internal';
import { ProjectionModel, View } from '@dxos/schema';

import { VIEW_EDITOR_DEBUG_SYMBOL } from '../testing';

import * as stories from './ViewEditor.stories';
import { type ViewEditorDebugObjects } from './ViewEditor.stories';

const { Default } = composeStories(stories);

const getViewEditorDebugObjects = (): ViewEditorDebugObjects => {
  const debugObjects = (window as any)[VIEW_EDITOR_DEBUG_SYMBOL] as ViewEditorDebugObjects;
  expect(debugObjects).toBeDefined();
  expect(debugObjects.schema).toBeInstanceOf(EchoSchema);
  expect(isInstanceOf(View.View, debugObjects.view)).toBeTruthy();
  expect(debugObjects.projection).toBeInstanceOf(ProjectionModel);
  return debugObjects;
};

const waitForViewEditor = async () => {
  await waitFor(
    () => {
      expect(screen.getByTestId('debug')).toBeInTheDocument();
    },
    { timeout: 15000 },
  );
};

describe('ViewEditor', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders view editor', async () => {
    await Default.run();
    await waitForViewEditor();
    expect(screen.getByText('Record type')).toBeInTheDocument();
  });

  test('change property name', async () => {
    // Arrange.
    await Default.run();
    await waitForViewEditor();

    // Act.
    const nameField = screen.getByText('name');
    fireEvent.click(nameField);

    const fieldInput = screen.getByPlaceholderText('Property');
    fireEvent.change(fieldInput, { target: { value: 'new_property' } });

    fireEvent.click(screen.getByTestId('save-button'));

    // Wait for the changes to propagate to both UI and schema.
    await waitFor(() => {
      expect(screen.getByText('new_property')).toBeInTheDocument();
    });

    // Access the live objects directly from window using symbol.
    const debugObjects = getViewEditorDebugObjects();

    // Check schema contains new_property.
    const schemaProperties = debugObjects.schema.jsonSchema.properties;
    expect(schemaProperties).toBeDefined();
    expect(schemaProperties!.new_property).toBeDefined();
    expect(schemaProperties!.name).toBeUndefined();

    // Check view contains new_property field.
    const newPropertyField = debugObjects.view.projection.fields.find((field: any) => field.path === 'new_property');
    expect(newPropertyField).toBeDefined();
    expect(newPropertyField!.path).toBe('new_property');

    // Check projection contains new_property.
    const fieldProjections = debugObjects.projection.getFieldProjections();
    const newPropertyProjection = fieldProjections.find((proj: any) => proj.field.path === 'new_property');
    expect(newPropertyProjection).toBeDefined();
    expect(newPropertyProjection!.props.property).toBe('new_property');
  });

  test('add new property', async () => {
    await Default.run();
    await waitForViewEditor();

    // Click the add property button.
    const addButton = screen.getByText('Add property');
    fireEvent.click(addButton);

    // Open the last field.
    const buttons = screen.getAllByTestId('field.toggle');
    fireEvent.click(buttons.at(-1)!);

    // Fill out the property field.
    const fieldInput = screen.getByPlaceholderText('Property');
    fireEvent.change(fieldInput, { target: { value: 'added_property' } });

    // Click the format combo box and select the first option.
    const formatCombo = screen.getByRole('combobox');
    fireEvent.click(formatCombo);

    const firstOption = screen.getAllByRole('option')[0];
    fireEvent.click(firstOption);

    // Save the changes.
    fireEvent.click(screen.getByTestId('save-button'));

    // Wait for the changes to propagate.
    await waitFor(() => {
      expect(screen.getByText('added_property')).toBeInTheDocument();
    });

    // Access the live objects directly from window using symbol.
    const debugObjects = getViewEditorDebugObjects();

    // Check schema contains added_property.
    const schemaProperties = debugObjects.schema.jsonSchema.properties;
    expect(schemaProperties).toBeDefined();
    expect(schemaProperties!.added_property).toBeDefined();

    // Check view contains added_property field.
    const addedPropertyField = debugObjects.view.projection.fields.find(
      (field: any) => field.path === 'added_property',
    );
    expect(addedPropertyField).toBeDefined();
    expect(addedPropertyField!.path).toBe('added_property');

    // Check projection contains added_property.
    const fieldProjections = debugObjects.projection.getFieldProjections();
    const addedPropertyProjection = fieldProjections.find((proj: any) => proj.field.path === 'added_property');
    expect(addedPropertyProjection).toBeDefined();
    expect(addedPropertyProjection!.props.property).toBe('added_property');
  });

  // TODO(mykola): Fix flaky test.
  test('delete property', { retry: 2 }, async () => {
    await Default.run();
    await waitForViewEditor();

    // Find the delete button for the 'name' property.
    const nameProperty = screen.getByText('name');
    const propertyRow = nameProperty.closest('[role="listitem"]');
    const deleteButton = propertyRow?.querySelector('[data-testid="field.delete"]');

    if (!deleteButton) {
      throw new Error('Delete button not found');
    }

    // Click the delete button.
    fireEvent.click(deleteButton);

    // Wait for the changes to propagate.
    await waitFor(() => {
      expect(screen.queryByText('name')).not.toBeInTheDocument();
    });

    // Access the live objects directly from window using symbol.
    const debugObjects = getViewEditorDebugObjects();

    // Check schema no longer contains the name property.
    const schemaProperties = debugObjects.schema.jsonSchema.properties;
    expect(schemaProperties).toBeDefined();
    expect(schemaProperties!.name).toBeUndefined();

    // Check view no longer contains the name field.
    const nameField = debugObjects.view.projection.fields.find((field: any) => field.path === 'name');
    expect(nameField).toBeUndefined();

    // Check projection no longer contains the name property.
    const fieldProjections = debugObjects.projection.getFieldProjections();
    const nameProjection = fieldProjections.find((proj: any) => proj.field.path === 'name');
    expect(nameProjection).toBeUndefined();
  });

  test('hide and show property', async () => {
    await Default.run();
    await waitForViewEditor();

    // Click the first hide button.
    const hideButtons = screen.getAllByTestId('hide-field-button');
    fireEvent.click(hideButtons[0]);

    // Check that hiddenFields is non-empty.
    await waitFor(() => {
      expect(screen.getByTestId('show-field-button')).toBeInTheDocument();
    });

    // Access the live objects directly from window using symbol.
    const debugObjects = getViewEditorDebugObjects();

    // Click the show button
    fireEvent.click(screen.getByTestId('show-field-button'));

    // Wait for the data to update and check that hiddenFields is empty.
    await waitFor(() => {
      expect(debugObjects.view.projection.fields.filter(({ visible }) => visible === false)!.length).toBe(0);
    });

    // Also verify that the field is back in the visible fields list.
    expect(debugObjects.view.projection.fields.filter(({ visible }) => visible !== false).length).toBeGreaterThan(0);
  });
}, 30_000);
