//
// Copyright 2026 DXOS.org
//

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AssistantChat from '@dxos/assistant/Chat';
import type * as Trajectory from '@dxos/compute/Trajectory';
import { type Database } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import { useRegistry } from '@dxos/react-client/echo';

export type ChatModel = NonNullable<ReturnType<typeof AssistantHooks.useChatModel>>;

/** The chat model of a chat's own conversation, or of one of its subagent threads when `lane` is given. */
export const useThreadModel = (
  db: Database.Database | undefined,
  chat: AssistantChat.Chat | undefined,
  lane?: Trajectory.ThreadId,
) => {
  const registry = useRegistry();
  const runtime = Hooks.useProcessManagerRuntime();
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const { preset } = AssistantHooks.usePresets(settings, chat);
  return AssistantHooks.useChatModel({
    db,
    chat,
    preset,
    runtime,
    registry,
    settings,
    ...(lane ? { thread: lane } : {}),
  });
};
