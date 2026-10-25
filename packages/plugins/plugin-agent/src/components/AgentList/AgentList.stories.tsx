//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IdentityDid, PublicKey, SpaceId } from '@dxos/keys';
import { createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { AgentList, type AgentListSpace } from './AgentList.tsx';

const spaces: AgentListSpace[] = ['Kai', 'Studio', 'Offsite team', 'Scout'].map((name) => ({
  id: SpaceId.random(),
  key: PublicKey.random(),
  name,
}));

const makeAgent = (displayName: string, shared: AgentListSpace[]) =>
  createBuf(ContactSchema, {
    identityKey: fromPublicKey(PublicKey.random()),
    did: IdentityDid.random(),
    profile: createBuf(ProfileDocumentSchema, { displayName }),
    commonSpaces: shared.map((space) => fromPublicKey(space.key)),
  });

const agents = [makeAgent('Kai', spaces.slice(0, 3)), makeAgent('Scout', spaces.slice(3))];

const meta = {
  title: 'plugins/plugin-agent/components/AgentList',
  component: AgentList,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof AgentList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { agents, spaces },
};

export const Filtered: Story = {
  args: { agents, spaces, filter: 'sco' },
};

export const Empty: Story = {
  args: { agents: [], spaces },
};
