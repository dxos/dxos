//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import { Sequence } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as SpaceSurface from '@dxos/plugin-space/SpaceSurface';
import { Position } from '@dxos/util';

import {
  AgentArticle,
  AgentProperties,
  ChatArticle,
  ChatCompanion,
  ChatDialog,
  IntegrationPrompt,
  ObjectCardSurface,
  PluginPrompt,
  PluginUrlPrompt,
  QuestionSurface,
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

const isUnprovisionedAssistantCompanion = (data: { subject?: unknown; variant?: unknown }) =>
  data.subject == null && data.variant === ASSISTANT_COMPANION_VARIANT;

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: AssistantSettingsSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'spaceHomePrompt',
        filter: Surface.Root.makeFilter(SpaceSurface.SpaceHomePinBottom),
        component: SpaceHomePrompt,
        props: ({ data: { space } }) => ({ space }),
      }),
      Surface.Root.create({
        id: 'spaceHomeSuggestions',
        filter: Surface.Root.makeFilter(SpaceSurface.SpaceHomeContent),
        position: Position.last,
        component: SpaceHomeSuggestionsSurface,
        props: ({ data: { space } }) => ({ space }),
      }),
      Surface.Root.create({
        id: 'chat',
        filter: AppSurface.object(
          AppSurface.Article,
          Chat.Chat,
          (data) => data.variant !== ASSISTANT_COMPANION_VARIANT,
        ),
        component: ChatArticle,
        props: ({ role, ref, data: { subject, attendableId, nodeId } }) => ({
          role,
          subject,
          attendableId,
          nodeId,
          ref,
        }),
      }),
      Surface.Root.create({
        id: 'agent',
        filter: AppSurface.object(AppSurface.Article, Agent.Agent),
        component: AgentArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Agent.Agent),
        component: AgentProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'companionChat',
        filter: Surface.Root.makeFilter(
          AppSurface.Article,
          (data) =>
            Obj.isObject(data.companionTo) &&
            (Obj.instanceOf(Chat.Chat, data.subject) || isUnprovisionedAssistantCompanion(data)),
        ),
        component: ChatCompanion,
        props: ({ role, ref, data: { subject, attendableId, nodeId, companionTo } }) => ({
          role,
          subject,
          attendableId,
          nodeId,
          companionTo,
          ref,
        }),
      }),
      Surface.Root.create({
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
      Surface.Root.create({
        id: ASSISTANT_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof ChatDialog>>(AppSurface.Dialog, ASSISTANT_DIALOG),
        component: ChatDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.Root.create({
        id: 'trace',
        filter: Surface.Root.makeFilter(AppSurface.deckCompanion('trace')),
        component: TracePanelSurface,
      }),
      Surface.Root.create({
        id: 'integrationPrompt',
        filter: Surface.Root.makeFilter(ChatSurface.ChatSurface, (data) => data.role === 'integration-prompt'),
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
      Surface.Root.create({
        id: 'pluginPrompt',
        filter: Surface.Root.makeFilter(ChatSurface.ChatSurface, (data) => data.role === 'plugin-prompt'),
        component: PluginPrompt,
        // `data.data` is model-supplied JSON (untyped); narrow `plugin` before use.
        props: ({ data }) => ({ plugin: typeof data.data?.plugin === 'string' ? data.data.plugin : undefined }),
      }),
      Surface.Root.create({
        id: 'pluginUrlPrompt',
        filter: Surface.Root.makeFilter(ChatSurface.ChatSurface, (data) => data.role === 'plugin-url-prompt'),
        component: PluginUrlPrompt,
        // `data.data` is model-supplied JSON (untyped); narrow before use.
        props: ({ data }) => ({ url: nonBlank(data.data?.url), name: nonBlank(data.data?.name) }),
      }),
      // `<surface role='card' data='{"id":"echo://…"}'>`: the object as its card.
      Surface.Root.create({
        id: 'objectCard',
        filter: Surface.Root.makeFilter(
          ChatSurface.ChatSurface,
          (data) => data.role === 'card' && EID.tryParse(nonBlank(data.data?.id) ?? '') !== undefined,
        ),
        component: ObjectCardSurface,
        props: ({ data }) => ({ id: nonBlank(data.data?.id) }),
      }),
      Surface.Root.create({
        id: 'question',
        filter: Surface.Root.makeFilter(ChatSurface.ChatSurface, (data) => data.role === 'question'),
        component: QuestionSurface,
        // `data.data` is model-supplied JSON (untyped); narrow the ids before use.
        props: ({ data }) => ({ task: nonBlank(data.data?.task), question: nonBlank(data.data?.question) }),
      }),
      Surface.Root.create({
        id: 'triggerStatus',
        filter: Surface.Root.makeFilter(AppSurface.StatusIndicator),
        component: TriggerStatusSurface,
      }),
    ]),
  ),
);

/** A model-supplied string, or undefined when it is absent or blank. */
const nonBlank = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
