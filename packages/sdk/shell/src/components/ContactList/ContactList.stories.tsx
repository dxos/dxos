//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { createContactFixtures } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { ContactList } from './ContactList.tsx';

const { spaces, contacts } = createContactFixtures();

const meta = {
  title: 'sdk/shell/ContactList',
  component: ContactList,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof ContactList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { contacts, spaces } };

export const Filtered: Story = { args: { contacts, spaces, filter: 'bo' } };

export const Empty: Story = { args: { contacts: [], spaces } };
