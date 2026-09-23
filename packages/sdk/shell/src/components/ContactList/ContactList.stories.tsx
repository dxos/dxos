//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations.ts';
import { ContactList, type ContactSpace } from './ContactList.tsx';

const spaces: ContactSpace[] = [
  { id: 'a', key: PublicKey.random(), name: 'Design' },
  { id: 'b', key: PublicKey.random(), name: 'Engineering' },
];

const contacts = ['Alice', 'Bob', 'Carol'].map((displayName, index) =>
  create(ContactSchema, {
    identityKey: fromPublicKey(PublicKey.random()),
    profile: create(ProfileDocumentSchema, { displayName }),
    commonSpaces: spaces.slice(0, index + 1).map((space) => fromPublicKey(space.key)),
  }),
);

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
