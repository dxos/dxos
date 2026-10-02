//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Scope from 'effect/Scope';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Database } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { toPublicKey } from '@dxos/protocols/buf';
import { isTauri } from '@dxos/util';

import { AgentError } from '../errors.ts';
import * as CodeCapabilities from '../types/CodeCapabilities.ts';
import * as Settings from '../types/Settings.ts';
import * as AcpAgent from './AcpAgent.ts';

/** How long to wait for the agent helper to appear before reporting the agent unavailable. */
const HELPER_WAIT = { attempts: 30, interval: '1 second' } as const;

export type Definition = {
  /** The harness id chats name (`chat.session.harness`); also the helper's agent directory. */
  id: string;
  label: string;
  icon: string;
};

/**
 * A coding agent the desktop app runs through its agent helper, as the agent-registry entry a plugin
 * contributes. Where the helper cannot run (the web app) the agent is listed but unavailable.
 */
export const make = (
  definition: Definition,
): Effect.Effect<AssistantCapabilities.Agent, never, Scope.Scope | Capability.Service> =>
  Effect.gen(function* () {
    const manager = yield* Capability.Service;
    const sessions = yield* AcpAgent.Sessions.make();
    const availability = Atom.make<AssistantCapabilities.AgentAvailability>(
      isTauri()
        ? { available: false, reason: 'looking for it on this computer' }
        : { available: false, reason: 'needs the Composer desktop app' },
    );

    const helper = () => manager.getAll(CodeCapabilities.AgentHelper).at(0);
    const settings = (): Settings.Settings | undefined => {
      const [atom] = manager.getAll(CodeCapabilities.Settings);
      const [registry] = manager.getAll(Capabilities.AtomRegistry);
      return atom && registry ? registry.get(atom) : undefined;
    };

    if (isTauri()) {
      yield* probe(definition.id, helper, (value) =>
        manager.getAll(Capabilities.AtomRegistry).at(0)?.set(availability, value),
      ).pipe(Effect.forkScoped);
    }

    const options: AcpAgent.AgentOptions = {
      id: definition.id,
      sessions,
      connect: (cwd) => {
        const current = helper();
        return current
          ? current.connect(definition.id, cwd)
          : Effect.fail(new AgentError({ message: `${definition.label} needs the Composer desktop app.` }));
      },
      workspace: () => {
        const folder = settings()?.agentWorkspace?.trim();
        return folder
          ? Effect.succeed(folder)
          : Effect.fail(
              new AgentError({
                message: `Choose the folder ${definition.label} works in, in the Code plugin settings.`,
              }),
            );
      },
      mode: () => settings()?.agentPermissionMode ?? Settings.DEFAULT_AGENT_PERMISSION_MODE,
      device: () => toPublicKey(manager.getAll(ClientCapabilities.Client).at(0)?.halo.device?.deviceKey)?.toHex(),
    };

    return {
      id: definition.id,
      label: definition.label,
      icon: definition.icon,
      availability,
      makeTurnProducer: AcpAgent.makeTurnProducer(options),
      respond: ({ chat, message, requestId, optionId }) =>
        Effect.gen(function* () {
          const feed = yield* Database.load(chat.feed).pipe(Effect.option);
          if (Option.isNone(feed)) {
            log.warn('request answered for a chat without a feed', { chat: chat.id });
            return false;
          }
          return yield* AcpAgent.respond(sessions, { chat, feed: feed.value, message, requestId, optionId });
        }),
    } satisfies AssistantCapabilities.Agent;
  });

/** Asks the helper whether the agent's tool is installed, waiting for the helper to start first. */
const probe = (
  id: string,
  helper: () => CodeCapabilities.AgentHelper | undefined,
  set: (value: AssistantCapabilities.AgentAvailability) => void,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < HELPER_WAIT.attempts; attempt++) {
      const current = helper();
      if (current) {
        set(
          yield* current.agents.pipe(
            Effect.match({
              onFailure: (error): AssistantCapabilities.AgentAvailability => ({
                available: false,
                reason: error.message,
              }),
              onSuccess: (statuses): AssistantCapabilities.AgentAvailability => {
                const status = statuses.find((status) => status.id === id);
                return status?.available
                  ? { available: true }
                  : { available: false, reason: status?.reason ?? 'not included in this desktop app' };
              },
            }),
          ),
        );
        return;
      }
      yield* Effect.sleep(HELPER_WAIT.interval);
    }
    set({ available: false, reason: 'the agent helper did not start' });
  });
