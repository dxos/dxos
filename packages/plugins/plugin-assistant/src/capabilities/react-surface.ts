//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import { Sequence } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import * as SpaceSurface from '@dxos/plugin-space/SpaceSurface';
import { Position } from '@dxos/util';

import {
  AgentArticle,
  AgentProperties,
  ChatArticle,
  ChatCompanion,
  ChatDialog,
  IntegrationPrompt,
  PluginPrompt,
  SpaceHomePrompt,
} from '#containers';
import { ASSISTANT_COMPANION_VARIANT, ASSISTANT_DIALOG, meta } from '#meta';
import { ChatSurface } from '#types';

import {
  AssistantSettingsSurface,
  InvocationsSurface,
  SpaceHomeSuggestionsSurface,
  TracePanelSurface,
  TriggerStatusSurface,
} from './AssistantSurfaces.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: AssistantSettingsSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'spaceHomePrompt',
        filter: Surface.makeFilter(SpaceSurface.SpaceHomePinBottom),
        component: SpaceHomePrompt,
        props: ({ data: { space } }) => ({ space }),
      }),
      Surface.create({
        id: 'spaceHomeSuggestions',
        filter: Surface.makeFilter(SpaceSurface.SpaceHomeContent),
        position: Position.last,
        component: SpaceHomeSuggestionsSurface,
        props: ({ data: { space } }) => ({ space }),
      }),
      Surface.create({
        id: 'chat',
        filter: AppSurface.object(
          AppSurface.Article,
          Chat.Chat,
          (data) => data.variant !== ASSISTANT_COMPANION_VARIANT,
        ),
        component: ChatArticle,
        props: ({ role, ref, data: { subject, attendableId } }) => ({ role, subject, attendableId, ref }),
      }),
      Surface.create({
        id: 'agent',
        filter: AppSurface.object(AppSurface.Article, Agent.Agent),
        component: AgentArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Agent.Agent),
        component: AgentProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'companionChat',
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data) => Obj.isObject(data.companionTo) && Obj.instanceOf(Chat.Chat, data.subject),
        ),
        component: ChatCompanion,
        props: ({ role, ref, data: { subject, attendableId, companionTo } }) => ({
          role,
          subject,
          attendableId,
          companionTo,
          ref,
        }),
      }),
      Surface.create({
        id: 'companionInvocations',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'invocations'),
          AppSurface.oneOf(
            AppSurface.companion(AppSurface.Article, Sequence.Sequence),
            AppSurface.companion(AppSurface.Article, Instructions.Instructions),
          ),
        ),
        component: InvocationsSurface,
        props: ({ role, data: { companionTo } }) => ({ role, companionTo }),
      }),
      Surface.create({
        id: ASSISTANT_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof ChatDialog>>(AppSurface.Dialog, ASSISTANT_DIALOG),
        component: ChatDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: 'trace',
        filter: Surface.makeFilter(AppSurface.deckCompanion('trace')),
        component: TracePanelSurface,
      }),
      Surface.create({
        id: 'integrationPrompt',
        filter: Surface.makeFilter(ChatSurface.ChatSurface, (data) => data.role === 'integration-prompt'),
        component: IntegrationPrompt,
        // `data.data` is model-supplied JSON, so every field is narrowed and blanks dropped.
        props: ({ data }) => ({
          service: nonBlank(data.data?.service),
          scopes: Array.isArray(data.data?.scopes)
            ? data.data.scopes.map(nonBlank).filter((scope): scope is string => scope !== undefined)
            : undefined,
          reason: nonBlank(data.data?.reason),
        }),
      }),
      Surface.create({
        id: 'pluginPrompt',
        filter: Surface.makeFilter(ChatSurface.ChatSurface, (data) => data.role === 'plugin-prompt'),
        component: PluginPrompt,
        // `data.data` is model-supplied JSON (untyped); narrow `plugin` before use.
        props: ({ data }) => ({ plugin: typeof data.data?.plugin === 'string' ? data.data.plugin : undefined }),
      }),
      Surface.create({
        id: 'triggerStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: TriggerStatusSurface,
      }),
    ]),
  ),
);

/** A model-supplied string, or undefined when it is absent or blank. */
const nonBlank = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
