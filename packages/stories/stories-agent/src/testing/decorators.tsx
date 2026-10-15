//
// Copyright 2026 DXOS.org
//

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import { type Database, type Type } from '@dxos/echo';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import * as AgentEmail from '@dxos/plugin-agent/AgentEmail';
import * as AgentPlugin from '@dxos/plugin-agent/AgentPlugin';
import * as Goal from '@dxos/plugin-agent/Goal';
import * as Mode from '@dxos/plugin-agent/Mode';
import * as Relay from '@dxos/plugin-agent/Relay';
import { translations as agentTranslations } from '@dxos/plugin-agent/translations';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import { translations as assistantTranslations } from '@dxos/plugin-assistant/translations';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import * as DiscordPlugin from '@dxos/plugin-discord/DiscordPlugin';
import { translations as discordTranslations } from '@dxos/plugin-discord/translations';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';
import { type Config } from '@dxos/react-client';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { createStoryDecorators, makeModuleSurfacesPlugin } from '@dxos/storybook-testing';
import { HasSubject, Organization, Person, ProfileOf } from '@dxos/types';

import { moduleSurfaces } from '../modules/index.ts';
import { StorySetupPlugin } from './setup-plugin.ts';

/** Shared CSF parameters for this package's stories (fullscreen canvas + plugin translations). */
export const storyParameters = {
  layout: 'fullscreen',
  translations: [
    ...agentTranslations,
    ...assistantTranslations,
    ...connectorTranslations,
    ...discordTranslations,
    ...formTranslations,
    ...reactUiTranslations,
  ],
};

/** The agent's objects, the team it knows, and its Discord and email channel configs. */
const TYPES: Type.AnyEntity[] = [
  Person.Person,
  Organization.Organization,
  HasSubject.HasSubject,
  ProfileOf.ProfileOf,
  Goal.Goal,
  Mode.Mode,
  Relay.Relay,
  AgentChannels.AgentChannels,
  AgentEmail.AgentEmail,
  DiscordChannel.DiscordChannel,
];

export type DecoratorsProps = {
  /** The client config; the live stories use {@link storyConfig}. */
  config?: Config;
  /** Seeds the space through plugin operations once it is available. */
  onReady: (props: { db: Database.Database; invoker: Capabilities.OperationInvoker }) => Promise<void>;
};

/** Props, or a function of the story's args, so a story's config (e.g. `persistent`) can follow its Controls. */
export type DecoratorsInput<Args> = DecoratorsProps | ((context: { args: Args }) => DecoratorsProps);

const makeDecoratorProps = ({ config, onReady }: DecoratorsProps) => ({
  ...(config ? { config } : {}),
  // Skill definitions ride the assistant's start event; without it the agent's skill rows render blank labels.
  setupEvents: [AppActivationEvents.AssistantStart],
  types: TYPES,
  plugins: [
    AssistantPlugin.make(),
    ThreadPlugin.make(),
    AgentPlugin.make(),
    ConnectorPlugin.make(),
    // Copies the plugins' skill definitions into the client registry, which resolves an agent's bound skills.
    RoutinePlugin.make(),
    DiscordPlugin.make(),
    makeModuleSurfacesPlugin('org.dxos.plugin.stories-agent.modules', moduleSurfaces),
    StorySetupPlugin({ onReady }),
  ],
});

/** The agent stack on Discord: assistant, threads, agents, connectors (Discord sign-in) and Discord itself. */
export const createDecorators = <Args,>(input: DecoratorsInput<Args>) =>
  createStoryDecorators<Args>(
    typeof input === 'function' ? (context) => makeDecoratorProps(input(context)) : makeDecoratorProps(input),
  );
