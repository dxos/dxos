//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Obj, Ref, Tag } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';
import { Person } from '@dxos/types';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { ObjectForm, ObjectProperties } from './ObjectForm.tsx';

type StoryArgs = PaneArgs & { component?: 'form' | 'properties' };

const DefaultStory = ({ component = 'form' }: StoryArgs) => {
  const { space } = useClientStory();
  const [person] = useQuery(space?.db, Filter.type(Person.Person));
  const [snapshot] = useObject(person);
  if (!person) {
    return <></>;
  }

  const footer = (
    <Next.Panel.Footer>
      <Next.Typography truncate data-testid='object'>
        {JSON.stringify({ ...snapshot, tags: Obj.getMeta(person).tags.map((tag) => tag.target?.label) })}
      </Next.Typography>
    </Next.Panel.Footer>
  );
  return component === 'properties' ? (
    <Next.Panel.Root size='sm'>
      <ObjectProperties object={person} />
      {footer}
    </Next.Panel.Root>
  ) : (
    <Next.Panel.Root size='sm'>
      <Next.Panel.Body>
        <ObjectForm object={person} type={Person.Person} />
      </Next.Panel.Body>
      {footer}
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/ObjectForm',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withNextPane({ height: '48rem' }),
    withClientProvider({
      types: [Person.Person, Tag.Tag],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(Tag.make({ label: 'Colleague', hue: 'sky' }));
        const tag = space.db.add(Tag.make({ label: 'Friend', hue: 'emerald' }));
        const person = space.db.add(
          Obj.make(Person.Person, {
            fullName: 'Alice Carroll',
            jobTitle: 'Engineer',
            emails: [{ value: 'alice@example.com' }],
          }),
        );
        Obj.update(person, (person) => {
          Obj.getMeta(person).tags = [Ref.make(tag)];
        });
      },
    }),
  ],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Properties: Story = { args: { component: 'properties' } };

const readObject = (canvasElement: HTMLElement) =>
  JSON.parse(within(canvasElement).getByTestId('object').textContent ?? '{}');

/** 1. Test: the object's fields and meta tags edit the live object; a tag is picked and created inline. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. The form shows the live object (the client creates its space asynchronously).
    const name = await canvas.findByDisplayValue('Alice Carroll', {}, { timeout: 15_000 });

    // 3. An edit writes the property back to the object.
    await userEvent.clear(name);
    await userEvent.type(name, 'Alice Liddell');
    await waitFor(() => expect(readObject(canvasElement).fullName).toBe('Alice Liddell'));

    // 4. The meta tags are a Tags array whose row picks a Tag ref; adding one and picking writes `meta.tags`.
    const tags = canvas.getByRole('listbox', { name: 'Tags' });
    await expect(within(tags).getAllByRole('option')).toHaveLength(1);
    await expect(within(tags).getByText('Friend')).toBeVisible();
    await userEvent.click(canvas.getByTestId('_tags.add'));
    await waitFor(() => expect(within(tags).getAllByRole('option')).toHaveLength(2));
    const triggers = tags.querySelectorAll<HTMLElement>('[data-scope="combobox"][data-part="trigger"]');
    await userEvent.click(triggers[1]);
    await userEvent.click(within(await body.findByRole('dialog')).getByRole('option', { name: 'Colleague' }));
    await waitFor(() => expect(readObject(canvasElement).tags).toEqual(['Friend', 'Colleague']));

    // 5. An unmatched query creates a tag inline, seeded with the query as its label, with a hue Select.
    await userEvent.click(canvas.getByTestId('_tags.add'));
    await waitFor(() => expect(within(tags).getAllByRole('option')).toHaveLength(3));
    await userEvent.click(tags.querySelectorAll<HTMLElement>('[data-scope="combobox"][data-part="trigger"]')[2]);
    const popup = await body.findByRole('dialog');
    await userEvent.keyboard('Family');
    await userEvent.click(within(popup).getByRole('option', { name: 'Create “Family”' }));
    await expect(await within(popup).findByRole('textbox', { name: 'Label' })).toHaveValue('Family');
    await expect(within(popup).getByRole('combobox', { name: 'Hue' })).toBeInTheDocument();
    await userEvent.click(within(popup).getByTestId('save-button'));
    await waitFor(() => expect(readObject(canvasElement).tags).toEqual(['Friend', 'Colleague', 'Family']));
  },
};

/** 1. TestProperties: the properties pane scrolls its own form and edits the object the same way. */
export const TestProperties: Story = {
  args: { component: 'properties' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = await canvas.findByDisplayValue('Engineer', {}, { timeout: 15_000 });
    await userEvent.type(title, ' II');
    await waitFor(() => expect(readObject(canvasElement).jobTitle).toBe('Engineer II'));
    await expect(within(canvas.getByRole('listbox', { name: 'Tags' })).getByText('Friend')).toBeVisible();
  },
};
