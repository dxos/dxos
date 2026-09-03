//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { getSession } from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';

import { AssistantCapabilities, AssistantOperation } from '#types';

import { defaultPreset } from '../processor/index.ts';

const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInChat> =
  AssistantOperation.RunPromptInChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat, prompt }) {
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
