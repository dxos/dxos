//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { SessionConfig } from '@dxos/ai';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Chat from '@dxos/assistant/Chat';
import { useObject } from '@dxos/echo-react';

import { AssistantCapabilities } from '#types';

import { type AgentOption, agentOptions } from '../util/agent-options.ts';

/** The chat's agent and the picker's rows, live with each agent's availability. */
export const useChatAgent = (chat: Chat.Chat | undefined): { current: string; options: AgentOption[] } => {
  const agents = Hooks.useOptionalCapabilities(AssistantCapabilities.Agent);
  const availabilityAtom = useMemo(() => Atom.make((get) => agents.map((agent) => get(agent.availability))), [agents]);
  const availability = useAtomValue(availabilityAtom);
  const [session] = useObject(chat, 'session');
  const current = SessionConfig.harnessOf(session);
  const options = useMemo(() => agentOptions({ agents, availability, current }), [agents, availability, current]);
  return { current, options };
};
