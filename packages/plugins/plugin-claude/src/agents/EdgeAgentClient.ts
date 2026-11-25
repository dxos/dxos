//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import type * as Scope from 'effect/Scope';

import * as Capability from '@dxos/app-framework/Capability';
import { type Client } from '@dxos/client';
import { accessTokenResolverFromEdge } from '@dxos/compute-runtime';
import { EdgeProcessControl } from '@dxos/edge-compute';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import * as EdgeAgent from './EdgeAgent.ts';

/**
 * A coding agent EDGE runs in a sandbox container (compute-service's coding-agent process), as the
 * agent-registry entry a plugin contributes. The session lives on EDGE: it keeps working with no client
 * connected, and EDGE restarts the container and resumes the turn when the agent dies or stalls. A turn
 * here submits the prompt and folds the process's outputs into the chat as they arrive.
 */
export const make = (
  definition: EdgeAgent.Definition,
): Effect.Effect<AssistantCapabilities.Agent, never, Scope.Scope | Capability.Service> =>
  Effect.gen(function* () {
    const manager = yield* Capability.Service;
    let cached: { client: Client; control: EdgeAgent.ProcessControl } | undefined;
    const control = (): EdgeAgent.ProcessControl | undefined => {
      const client = manager.getAll(ClientCapabilities.Client).at(0);
      if (!client) {
        return undefined;
      }
      if (cached?.client !== client) {
        cached = { client, control: EdgeAgent.fromRemoteControl(EdgeProcessControl.fromClient(client)) };
      }
      return cached.control;
    };

    // Resolves a token EDGE custodies (the GitHub App's) through the signed-in client.
    const accessTokens = accessTokenResolverFromEdge(() => {
      const client = manager.getAll(ClientCapabilities.Client).at(0);
      invariant(client, 'no client to resolve the access token through');
      return client.edge.http;
    });

    // Lent to every turn so the agent reaches the space through Composer's MCP server, as the signed-in identity.
    const composerMcp = EdgeAgent.composerMcpCredentials(() =>
      manager.getAll(ClientCapabilities.IdentityService).at(0),
    );

    const options: EdgeAgent.Options = { definition, control, accessTokens, composerMcp };
    return {
      id: definition.id,
      label: definition.label,
      icon: definition.icon,
      availability: Atom.make<AssistantCapabilities.AgentAvailability>({ available: true }),
      makeTurnProducer: EdgeAgent.makeTurnProducer(options),
      respond: (response) =>
        EdgeAgent.respond(options, response).pipe(
          Effect.catch((error) =>
            Effect.sync(() => {
              log.warn('request not answered', { chat: response.chat.id, error });
              return false;
            }),
          ),
        ),
    } satisfies AssistantCapabilities.Agent;
  });
