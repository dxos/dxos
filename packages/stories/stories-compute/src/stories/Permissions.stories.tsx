//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import { Alarm } from '@dxos/assistant';
import * as Session from '@dxos/assistant/Session';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Config } from '@dxos/config';
import { Feed, Tag } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { Text } from '@dxos/schema';
import { ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';
import { Message, Organization } from '@dxos/types';

import { PermissionProvider, StoryRole } from '../modules/index.ts';
import { makePermissionDemoSkill } from '../testing/index.ts';
import { EDGE_DEV_URL, surfacesPlugin } from '../testing/story-config.ts';

/** Agents run only in this runtime. */
const LocalProvider = ({ children }: PropsWithChildren) => <PermissionProvider>{children}</PermissionProvider>;

/** Agents run locally or on the EDGE service the client is configured for. */
const EdgeProvider = ({ children }: PropsWithChildren) => <PermissionProvider edge>{children}</PermissionProvider>;

/** The organizations the agents read and update. */
const ORGANIZATIONS: { name: string; status: Organization.Organization['status'] }[] = [
  { name: 'Acme Robotics', status: 'prospect' },
  { name: 'Bramble Coffee Roasters', status: 'active' },
  { name: 'Lisbon Tram Company', status: 'qualified' },
];

const types = [
  Session.Session,
  Skill.Skill,
  Instructions.Instructions,
  Operation.PersistentOperation,
  Text.Text,
  Alarm.Alarm,
  Feed.Feed,
  Message.Message,
  Trigger.Trigger,
  Tag.Tag,
  Organization.Organization,
];

const seed = async ({ space }: { space: Space }) => {
  space.db.add(makePermissionDemoSkill());
  for (const { name, status } of ORGANIZATIONS) {
    space.db.add(Organization.make({ name, status }));
  }
  await space.db.flush({ indexes: true });
};

/** EDGE with replication, so the agent's chat and feed reach the runtime that runs it. */
const edgeConfig = new Config({
  version: 1,
  runtime: {
    client: {
      edgeFeatures: { signaling: true, agents: true, subductionReplicator: true, feedReplicator: true },
    },
    services: { edge: { url: EDGE_DEV_URL } },
  },
});

/**
 * Opt-in permissions as a process configurator: each agent is a real model spawned with a guard
 * holding grants for exactly the checked permissions, and its tools are database and sandbox
 * operations that declare what they require. A tool call the grants do not cover is refused.
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-compute/Permissions',
  render: ModuleContainer,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...debugTranslations],
  },
  args: {
    layout: [[StoryRole.PermissionConfigurator, StoryRole.PermissionProcesses], [StoryRole.PermissionAgents]],
    columns: '26rem_1fr',
    rows: ['1fr_18rem'],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: LocalProvider,
    types,
    onInit: seed,
  }),
};

export const Edge: Story = {
  decorators: createStoryDecorators({
    plugins: [surfacesPlugin()],
    Wrapper: EdgeProvider,
    config: edgeConfig,
    types,
    onInit: seed,
  }),
};
