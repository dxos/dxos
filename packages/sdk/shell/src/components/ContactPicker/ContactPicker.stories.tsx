//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';

import { createContactFixtures } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { contactKeyHex } from '../ContactList/index.ts';
import { ContactPicker, type ContactPickerInvitee } from './ContactPicker.tsx';

const { contacts } = createContactFixtures();

const AGENT: ContactPickerInvitee = { key: 'echo://agent/kai', label: 'Kai' };

const DefaultStory = ({
  excludeKeys,
  invitees,
}: {
  excludeKeys?: string[];
  invitees?: readonly ContactPickerInvitee[];
}) => {
  const [value, setValue] = useState<string>();
  return (
    <>
      <ContactPicker
        contacts={contacts}
        invitees={invitees}
        excludeKeys={excludeKeys}
        value={value}
        onChange={setValue}
      />
      <output data-testid='contact-picker.value'>{value ?? ''}</output>
    </>
  );
};

const meta = {
  title: 'sdk/shell/ContactPicker',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TestSelectAndExclude: Story = {
  args: { excludeKeys: [contactKeyHex(contacts[2])] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('contact-picker.trigger'));
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.queryByText('Carol Chen')).toBeNull();
    await userEvent.click(await body.findByText('Alice Adams'));
    await expect(canvas.getByTestId('contact-picker.value')).toHaveTextContent(contactKeyHex(contacts[0]));
    // Selecting closes the popover, so reopen it to search.
    await userEvent.click(canvas.getByTestId('contact-picker.trigger'));
    await userEvent.type(body.getByPlaceholderText('Search contacts…'), 'bo');
    // Only the list items: the trigger now shows the selected contact's name.
    const items = body.getAllByTestId('contact-picker.item').map((item) => item.textContent);
    await expect(items).toEqual(['Bob Brown']);
  },
};

export const TestInvitees: Story = {
  args: { invitees: [AGENT] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('contact-picker.trigger'));
    const body = within(canvasElement.ownerDocument.body);
    // Invitees follow the contacts.
    const items = body.getAllByTestId('contact-picker.item').map((item) => item.textContent);
    await expect(items.at(-1)).toBe('Kai');
    await userEvent.type(body.getByPlaceholderText('Search contacts…'), 'ka');
    await userEvent.click(await body.findByText('Kai'));
    await expect(canvas.getByTestId('contact-picker.value')).toHaveTextContent(AGENT.key);
  },
};
