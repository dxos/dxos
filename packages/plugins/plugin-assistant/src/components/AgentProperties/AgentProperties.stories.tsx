//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Agent } from '@dxos/assistant-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Organization } from '@dxos/types';

import { translations } from '#translations';

import { AgentProperties } from './AgentProperties';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  if (!agent) {
    return <Loading />;
  }

  return (
    <ObjectProperties object={agent}>
      <AgentProperties agent={agent} />
    </ObjectProperties>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/AgentProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Agent.Agent, Plan.Plan, Text.Text, Organization.Organization],
      onCreateSpace: async ({ space }) => {
        const organization = space.db.add(
          Obj.make(Organization.Organization, {
            name: 'Acme Corp',
            description: 'Sample organization for the story.',
          }),
        );

        space.db.add(
          Obj.make(Agent.Agent, {
            instructions: Ref.make(Text.make()),
            artifacts: [{ name: 'Organization', data: Ref.make(organization) }],
            subscriptions: [],
          }),
        );
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
