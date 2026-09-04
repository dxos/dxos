//
// Copyright 2025 DXOS.org
//

//
// Assistant-domain story harness, layered on `createStoryDecorators` from `@dxos/storybook-testing`
// (which owns the generic substrate: theme/layout, the plugin manager, client init/seeding/snapshot
// import, and the runtime-layout atom). This wrapper adds what is assistant-specific: the assistant
// plugin stack, chat/agent creation, skill binding, and the scripted (offline) model.
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { type ReactNode } from 'react';

import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AiContext } from '@dxos/assistant';
import {
  AgentHandlers,
  AgentSkill,
  DelegationSkill,
  DelegationSkillHandlers,
  PlanningHandlers,
  PlanningSkill,
  makeDelegationStrategy,
} from '@dxos/assistant-toolkit';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Project from '@dxos/compute/Project';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import { ExampleHandlers } from '@dxos/compute/testing';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Database, Filter, Obj, Ref } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { AccessToken } from '@dxos/link';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import { translations as assistantTranslations } from '@dxos/plugin-assistant/translations';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownOperationHandlerSet from '@dxos/plugin-markdown/MarkdownOperationHandlerSet';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';
import { Config } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { Text } from '@dxos/schema';
import { type StoryDecoratorsProps, createStoryDecorators } from '@dxos/storybook-testing';
import { Outline, Task, TaskSet } from '@dxos/types';
import { Merge, isNonNullable } from '@dxos/util';

import { moduleSurfaces } from '../modules';
import { CalculatorHandlers, CalculatorSkill } from './calculator';

/** Shared CSF parameters for the assistant story groups (fullscreen canvas + plugin translations). */
export const storyParameters = {
  layout: 'fullscreen',
  translations: [...assistantTranslations, ...debugTranslations],
};

// TODO(burdon): Factor out.
export const config = {
  remote: new Config({
    runtime: {
      services: SERVICES_CONFIG.REMOTE,
    },
  }),
  persistent: new Config({
    runtime: {
      client: {
        storage: {
          persistent: true,
        },
      },
      services: SERVICES_CONFIG.REMOTE,
    },
  }),
  local: new Config({
    runtime: {
      services: SERVICES_CONFIG.LOCAL,
    },
  }),
};

type DecoratorsProps = Merge<
  {
    /** Skill-definition keys to clone into the space and bind into the latest chat's context. */
    skills?: string[];
    /**
     * Replace the AI service with a scripted (offline, deterministic) model — see
     * `ScriptedLanguageModel`. Makes the full-stack story runnable without a network AI service,
     * e.g. from a `play` function in CI; routed scripts can drive cooperating sessions
     * (supervisor + sub-agents).
     */
    scripted?: ScriptedLanguageModel.Script;
  },
  Omit<StoryDecoratorsProps, 'Wrapper' | 'setupEvents'>,
  Pick<StoryPluginOptions, 'onChatCreated' | 'createAgent'>
>;

/**
 * Decorator body that binds story-declared skill keys into the latest chat's context. Rendered by
 * the shared harness inside the plugin-manager context (via the `Wrapper` prop), so its capability
 * hooks always resolve.
 */
const SkillBinder = ({ skills = [], children }: { skills?: string[]; children: ReactNode }) => {
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const skillDefinitions = useCapabilities(AppCapabilities.SkillDefinition);
  const [space] = useSpaces();
  // Reactive: the chat is created asynchronously (module.setup on SpacesReady), and skill
  // definitions may all be contributed before this mounts — a one-shot query that finds no chat
  // would never re-run, leaving the chat without its story-declared skills.
  const chats = useQuery(space?.db, Filter.type(Chat.Chat));

  useAsyncEffect(async () => {
    if (!space) {
      return;
    }
    const chat = chats.at(-1);
    if (!chat) {
      return;
    }

    const registry = makeRegistry({ initial: skillDefinitions.map((def) => def.make()) });
    const skillObjects = skills
      .map((key) => {
        const skill = registry
          .query(Filter.type(Skill.Skill))
          .runSync()
          .find((candidate) => Obj.getMeta(candidate).key === key);
        return skill ? space.db.add(Obj.clone(skill)) : undefined;
      })
      .filter(isNonNullable);

    const feed = await chat.feed.load();
    const runtime = await EffectEx.runAndForwardErrors(
      Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(space.db))),
    );
    const binder = new AiContext.Binder({ feed, runtime, registry: atomRegistry });
    await binder.use((binder) => binder.bind({ skills: skillObjects.map((skill) => Ref.make(skill)) }));
  }, [space, chats, skills, skillDefinitions]);

  return <>{children}</>;
};

/** Maps the assistant-domain props onto the shared harness props. */
const toStoryDecoratorsProps = ({
  config: configProp = config.remote,
  skills,
  scripted,
  createAgent,
  types = [],
  plugins = [],
  onChatCreated,
  ...props
}: DecoratorsProps): StoryDecoratorsProps => ({
  ...props,
  config: configProp,
  types: [
    AccessToken.AccessToken,
    Chat.Chat,
    Collection.Collection,
    Outline.Outline,
    Task.Task,
    TaskSet.TaskSet,
    Text.Text,
    Skill.Skill,
    Operation.PersistentOperation,
    Project.Project,
    Markdown.Document,
    Instructions.Instructions,
    Trigger.Trigger,
    ...types,
  ],
  plugins: [
    PreviewPlugin.make(),
    RoutinePlugin.make(),
    AssistantPlugin.make(
      scripted ? { aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware(scripted) } : {},
    ),
    TranscriptionPlugin.make(),
    StoryPlugin({ onChatCreated, createAgent }),
    ...plugins,
  ],
  Wrapper: skills?.length ? ({ children }) => <SkillBinder skills={skills}>{children}</SkillBinder> : undefined,
});

/**
 * Create storybook decorators for the assistant story groups: the shared harness plus the
 * assistant plugin stack, chat/agent creation, and skill binding. The function form gives seeding
 * code (e.g. `onInit`) access to the story's `args`.
 */
export const createDecorators = <Args = any,>(
  input: DecoratorsProps | ((context: { args: Args }) => DecoratorsProps),
) =>
  createStoryDecorators<Args>(
    typeof input === 'function' ? (context) => toStoryDecoratorsProps(input(context)) : toStoryDecoratorsProps(input),
  );

type CreateAgentOptions = {
  name?: string;
  instructions?: string;

  /**
   * Name of a project to parent the agent to. Delegation files tasks into the project's task set —
   * a conversation with no project above it has nowhere durable to promote to, so a story that
   * delegates has to supply one.
   */
  project?: string;
};

type StoryPluginOptions = {
  /**
   * If set, the story creates an Agent (with its own Chat) instead of a standalone Chat.
   * Accepts `true` for defaults, or an options object for name/instructions.
   */
  createAgent?: boolean | CreateAgentOptions;

  onChatCreated?: (props: { db: Database.Database; chat: Chat.Chat; binder: AiContext.Binder }) => Promise<void>;
};

const StoryPlugin = Plugin.define<StoryPluginOptions>(
  Plugin.makeMeta({
    key: DXN.make('com.example.plugin.testing'),
    name: 'Testing',
  }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.testing.module.surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () => Effect.succeed([Capability.contribute(Capabilities.ReactSurface, moduleSurfaces)]),
  }),
  Plugin.addModule({
    id: 'com.example.plugin.testing.module.testing',
    // Startup, not the implicit Idle: `AgentServiceSpec` reads `AgentDelegationStrategy` through
    // `Capability.getAll` once, when its layer materializes, so the contribution has to be in place
    // before anything can build that layer rather than merely before the story asserts.
    activatesOn: ActivationEvents.Startup,
    provides: [
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
      RoutineCapabilities.AgentDelegationStrategy,
    ],
    activate: () =>
      Effect.succeed([
        // TODO(burdon): Clean up.
        Capability.contributeAll(AppCapabilities.SkillDefinition, [
          MarkdownSkill,
          PlanningSkill,
          DelegationSkill,
          CalculatorSkill,
        ]),
        // Supervisor behaviour, so a delegating story spawns its sub-agent. The app's copy rides
        // plugin-assistant's `AssistantStart`-gated skill-definition module, which loses the race
        // against `AgentService`'s layer — that layer reads this capability once, at build time.
        Capability.contribute(RoutineCapabilities.AgentDelegationStrategy, makeDelegationStrategy()),
        Capability.contributeAll(Capabilities.OperationHandler, [
          MarkdownOperationHandlerSet.handlers,
          PlanningHandlers,
          DelegationSkillHandlers,
          AgentHandlers,
          ExampleHandlers,
          CalculatorHandlers,
        ]),
      ]),
  }),
  Plugin.addModule(({ createAgent, onChatCreated }) => ({
    id: 'com.example.plugin.testing.module.setup',
    // Runtime event: the space isn't available until the client observes it.
    activatesOn: ClientEvents.SpacesReady,
    requires: [Capabilities.OperationInvoker, ClientCapabilities.Client, Capabilities.AtomRegistry],
    activate: Effect.fnUntraced(function* () {
      const { invoke } = yield* Capabilities.OperationInvoker;
      const client = yield* ClientCapabilities.Client;
      const space = AppSpace.getDefaultSpace(client) ?? client.spaces.get()[0];
      invariant(space, 'No space available after initialization.');

      // Ensure workspace is set. NOTE: the active workspace that surfaces read via
      // `useActiveSpace()` is set from the React tree in `ModuleContainer` (the plugin-module
      // activation context resolves a different AtomRegistry than the UI).
      yield* invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });

      // Create agent.
      if (createAgent) {
        const agentOptions = typeof createAgent === 'object' ? createAgent : {};
        const agent = yield* Agent.makeInitialized(
          {
            name: agentOptions.name ?? 'Default',
            instructions: agentOptions.instructions ?? '',
          },
          AgentSkill.make(),
        ).pipe(
          Effect.provide(
            ServiceResolver.provide({ space: space.id }, Database.Service).pipe(
              Layer.provide(Capability.asLayer(Capabilities.ServiceResolver, ServiceResolver.ServiceResolver)),
            ),
          ),
        );
        if (agentOptions.project) {
          const project = space.db.add(Project.make({ name: agentOptions.project }));
          Obj.setParent(agent, project);
        }
        yield* Effect.tryPromise(() => space.db.flush({ indexes: true }));

        if (onChatCreated) {
          const registry = yield* Capabilities.AtomRegistry;
          const chat = yield* Agent.loadChat(agent).pipe(Effect.provide(Database.layer(space.db)));
          invariant(chat, 'Agent chat not found.');
          const feed = yield* Effect.promise(() => chat.feed.load());
          const runtime = yield* Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(space.db)));
          const binder = new AiContext.Binder({ feed, runtime, registry });
          yield* Effect.tryPromise(() => binder.open());
          // Ensure the binder is released even if the callback fails, so subscriptions/state do not
          // leak into later story or test runs.
          yield* Effect.tryPromise(() => onChatCreated({ db: space.db, chat, binder })).pipe(
            Effect.ensuring(Effect.promise(() => binder.close())),
          );
        }
      } else {
        // Create the initial chat via the canonical CreateChat operation (which binds the default
        // skills and the chat), then apply any story-specific context bindings. The story-side
        // `onChatCreated` must run here: the operation handler that creates the chat is owned by
        // the assistant plugin and has no hook for it.
        const { object: chat } = yield* invoke(AssistantOperation.CreateChat, {}, { spaceId: space.db.spaceId });
        // Added directly: this harness registers no plugin-space handlers, so `AddObject` has none.
        space.db.add(chat);
        if (onChatCreated) {
          const registry = yield* Capabilities.AtomRegistry;
          const feed = yield* Effect.promise(() => chat.feed.load());
          const runtime = yield* Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(space.db)));
          const binder = new AiContext.Binder({ feed, runtime, registry });
          yield* Effect.tryPromise(() => binder.open());
          // Ensure the binder is released even if the callback fails, so subscriptions/state do not
          // leak into later story or test runs.
          yield* Effect.tryPromise(() => onChatCreated({ db: space.db, chat, binder })).pipe(
            Effect.ensuring(Effect.promise(() => binder.close())),
          );
        }
      }
    }),
  })),
  Plugin.addModule(() => ({
    id: 'com.example.plugin.testing.module.operationHandler',
    provides: [Capabilities.OperationHandler],
    activate: Effect.fnUntraced(function* () {
      // NOTE: Chat creation is owned by the assistant plugin's `CreateChat` handler; this module
      // only stubs the no-op operations the deck companion surfaces expect.
      return [
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void)),
        ),
      ];
    }),
  })),
  Plugin.make,
);
