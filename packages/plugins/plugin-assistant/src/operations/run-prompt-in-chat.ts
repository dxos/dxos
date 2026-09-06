//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Chat from '@dxos/assistant/Chat';
import { getSession } from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { AssistantCapabilities, AssistantEvents, AssistantOperation } from '#types';

import { defaultPreset } from '../processor';

const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInChat> =
  AssistantOperation.RunPromptInChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat: chatProp, companionTo, prompt }) {
        // Activation first: the state and session providers this reads come from lazy modules that
        // otherwise activate only once the assistant UI has been opened, so a caller arriving through
        // an operation alone (an agent) would find them missing.
        const pluginManager = yield* Effect.serviceOption(Plugin.Service);
        yield* Option.match(pluginManager, {
          onNone: () => Effect.void,
          onSome: (manager) => manager.activate(AssistantEvents.Start),
        });
        const companion =
          chatProp === undefined && companionTo !== undefined
            ? yield* Operation.invoke(AssistantOperation.EnsureCompanionChat, { companionTo })
            : undefined;
        const chat = chatProp ?? companion?.chat;
        if (chat === undefined) {
          return yield* Effect.fail(new Error('Pass `chat` or `companionTo`.'));
        }
        // As the companion's own submit does: a transient chat is persisted under its subject before
        // the first request, so the agent process can resolve a durable conversation feed and space.
        const db = companionTo !== undefined ? Obj.getDatabase(companionTo) : undefined;
        if (companionTo !== undefined && db && !Obj.getDatabase(chat)) {
          Chat.linkCompanion({ chat, subject: companionTo });
          yield* Operation.invoke(SpaceOperation.AddObject, { object: chat }, { spaceId: db.spaceId });
          yield* Operation.invoke(AssistantOperation.SetCurrentChat, { companionTo, chat });
          yield* Effect.promise(() => db.flush());
        }
        const preset = yield* chatPreset;
        const session = yield* getSession(chat, {
          model: preset?.model,
          provider: preset?.provider,
        });
        yield* session.submitPrompt(prompt);
      }),
    ),
  );

/**
 * The preset the chat's UI would run with. Absent settings (a host with no assistant UI) leaves the
 * model unset, which is the agent process's own default.
 */
const chatPreset = Effect.gen(function* () {
  const settings = yield* Capabilities.getAtomValueOption(AssistantCapabilities.Settings);
  // The bundled sidecar's presence is what makes `built-in` rather than `ollama` the live provider.
  const ollama = yield* Capability.getOption(AssistantCapabilities.OllamaManager);
  return Option.match(settings, {
    onNone: () => undefined,
    onSome: (settings) => defaultPreset(settings, { hasBuiltIn: Option.isSome(ollama) }),
  });
});

export default handler;
