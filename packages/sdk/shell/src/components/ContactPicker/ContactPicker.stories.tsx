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
import { ContactPicker } from './ContactPicker.tsx';

const { contacts } = createContactFixtures();

const DefaultStory = ({ excludeKeys }: { excludeKeys?: string[] }) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <>
      <ContactPicker contacts={contacts} excludeKeys={excludeKeys} value={value} onChange={setValue} />
      <output data-testid='contact-picker.value'>{value.length}</output>
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
    await userEvent.click(await body.findByText('Bob Brown'));
    await expect(canvas.getByTestId('contact-picker.value')).toHaveTextContent('2');
    await userEvent.type(body.getByPlaceholderText('Search contacts…'), 'bo');
    await expect(body.queryByText('Alice Adams')).toBeNull();
  },
};
