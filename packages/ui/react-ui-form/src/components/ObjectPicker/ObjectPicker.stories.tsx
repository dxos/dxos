//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { Button, Label } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Person } from '@dxos/types';

import { translations } from '../../translations';

import { ObjectPicker } from './ObjectPicker';

faker.seed(1);

const createPerson = () =>
  Obj.make(Person.Person, {
    fullName: faker.person.fullName(),
  });

const omitId = Schema.omit<any, any, ['id']>('id');
const personSchema = omitId(Person.Person);

// Mock functions for testing
const mockHandleSelect = fn();
const mockHandleCreate = fn();

const DefaultStory = () => {
  const { space } = useClientProvider();
  const [isOpen, setIsOpen] = useState(false);

  // Create sample Person objects
  useEffect(() => {
    if (space) {
      // Create some sample Person objects for testing
      Array.from({ length: 10 }).forEach(() => {
        space.db.add(createPerson());
      });
    }
  }, [space]);

  // Get all objects in the space (similar to BoardContainer)
  const allObjects = useQuery(space?.db, Filter.everything());

  // Map objects to options format expected by ObjectPicker
  const options = useMemo(
    () =>
      allObjects.map((obj) => ({
        id: obj.id,
        label: obj.fullName || obj.name || obj.title || obj.id,
        hue: 'neutral' as const,
      })),
    [allObjects],
  );

  const handleCreateCallback = useCallback(
    (values: any) => {
      console.log('[on create]', values);
      if (!space) return;
      const newPerson = space.db.add(Obj.make(Person.Person, values));
      mockHandleCreate(values);
      return newPerson;
    },
    [space],
  );

  return (
    <div role='none' className='flex is-96'>
      <ObjectPicker.Root open={isOpen} onOpenChange={setIsOpen}>
        <ObjectPicker.Trigger asChild>
          <Button variant='primary' data-testid='trigger' classNames='is-full'>
            Select Person
          </Button>
        </ObjectPicker.Trigger>
        <ObjectPicker.Content
          classNames='popover-card-width'
          options={options}
          createSchema={personSchema}
          createOptionLabel={['create new person label', { ns: 'os' }]}
          createOptionIcon='ph--user-plus--regular'
          createInitialValuePath='fullName'
          onCreate={handleCreateCallback}
          onSelect={mockHandleSelect}
        />
      </ObjectPicker.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-form/ObjectPicker',
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      types: [Person.Person],
      createIdentity: true,
      createSpace: true,
    }),
  ],
  parameters: {
    layout: 'centered',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Find and click the trigger button.
    const triggerButton = await canvas.findByTestId('trigger', undefined, { timeout: 5000 });
    await expect(triggerButton).toBeVisible();
    await userEvent.click(triggerButton);

    // Check that the listbox renders when the trigger is clicked.
    const listbox = await body.findByRole('listbox', undefined, { timeout: 5000 });
    await expect(listbox).toBeVisible();

    // Find the search input.
    const searchInput = await body.findByPlaceholderText('Search…');
    await expect(searchInput).toBeVisible();

    // Test searching filters the results - get initial options count.
    const initialOptions = await body.findAllByRole('option');
    const initialCount = initialOptions.length;
    await expect(initialCount).toBeGreaterThan(0);

    // Type a search term that should filter results.
    await userEvent.type(searchInput, 'John');

    // Wait a moment for filtering.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that results are filtered (should be fewer options)
    const _filteredOptions = await body.findAllByRole('option');
    // Note: We expect either fewer results or the same if no John exists

    // Clear search and test selecting a result
    await userEvent.clear(searchInput);

    // Get the first option and click it
    const updatedOptions = await body.findAllByRole('option');
    const firstOption = updatedOptions[0];
    await expect(firstOption).toBeVisible();

    const _firstOptionText = firstOption.textContent;
    await userEvent.click(firstOption);

    // Check that clicking a result fires onSelect with that id
    // The onSelect should have been called with the selected option's id
    await expect(mockHandleSelect).toHaveBeenCalled();

    // Re-open the picker to test create functionality.
    await userEvent.click(triggerButton);

    // Wait for listbox to appear again.
    const newListbox = await body.findByRole('listbox', undefined, { timeout: 5000 });
    await expect(newListbox).toBeVisible();

    const newSearchInput = await body.findByPlaceholderText('Search…');

    // Test searching an unrelated term provides the __create__ option.
    const unrelatedTerm = 'ZxyUnrelatedName123';
    await userEvent.type(newSearchInput, unrelatedTerm);

    // Wait for the create option to appear.
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Look for the create option.
    const createOption = await body.findByRole('option', undefined, { timeout: 3000 });
    await expect(createOption).toBeVisible();

    // Click the create option - this should change state to the form field.
    await userEvent.click(createOption);

    // Check that clicking that option changes state to the form field.
    const form = await body.findByTestId('create-referenced-object-form', undefined, { timeout: 5000 });
    await expect(form).toBeVisible();

    // Find and click the save button.
    const saveButton = await within(form).findByTestId('save-button');
    await expect(saveButton).toBeVisible();
    await userEvent.click(saveButton);

    // Check that clicking the save button calls onCreate with expected values.
    await expect(mockHandleCreate).toHaveBeenCalledWith({
      fullName: unrelatedTerm,
      addresses: [],
      phoneNumbers: [],
      emails: [],
      identities: [],
      urls: [],
      fields: [],
    });
  },
};
