//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import type * as McpServer from '@dxos/compute/McpServer';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { McpToolkit } from '@dxos/mcp-client';

import { ToolkitError } from '../../../errors.ts';
import { ConnectMcpServer } from './definitions.ts';

export default ConnectMcpServer.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ skill: key, server }) {
      const notFound = () =>
        new ToolkitError({ message: `Skill '${key}' was not found in this space or the registry.` });
      // Read-only until both checks pass, so a refused or unreachable server leaves no registry copy in the space.
      const [local] = yield* Database.query(Filter.and(Filter.type(Skill.Skill), Filter.key(key))).run;
      const found = local ?? (yield* Skill.resolve(key).pipe(Effect.mapError(notFound)));

      const binder = yield* Harness.binder;
      const bound = binder.getSkills().some((candidate) => Obj.getMeta(candidate).key === key);
      if (!bound && !found.agentCanEnable) {
        return yield* Effect.fail(
          new ToolkitError({
            message: `Skill '${key}' is not enabled in this conversation and does not allow the agent to enable it, so its servers would never connect here.`,
          }),
        );
      }

      // Probed before anything is saved, so a server this client cannot reach is never left configured.
      const { tools } = yield* McpToolkit.probe(server).pipe(
        Effect.mapError((error) => new ToolkitError({ message: describeFailure(error), cause: error })),
      );

      // The server is written to the skill, so a registry skill needs its space copy.
      const skill = yield* Skill.upsert(key).pipe(Effect.mapError(notFound));
      Obj.update(skill, (skill) => {
        skill.mcpServers = [...(skill.mcpServers ?? []).filter(({ url }) => url !== server.url), storedSpec(server)];
      });
      yield* Harness.bindContext({ skills: [Ref.make(skill)] });

      return { skill, tools };
    }),
  ),
);

/** The failure as the model reads it: what the server said, and what would fix it. */
const describeFailure = (error: McpToolkit.McpConnectionError): string => {
  const base = `MCP server ${error.url} did not connect over ${error.protocol}, so it was not saved: ${error.message}.`;
  if (error.unauthorized) {
    return `${base} The server requires credentials: set the server's apiKey, or sign in to it.`;
  }
  if (/\b403\b/.test(error.message)) {
    return `${base} The server refused this client (HTTP 403); a challenge page means a proxy in front of it blocks non-browser clients, so deploy it where requests from this host are allowed.`;
  }
  return `${base} Check that the URL is the server's MCP endpoint and that it is running.`;
};

/** ECHO keeps an explicit `undefined` as a key, so absent optional fields are left out instead. */
const storedSpec = ({ name, url, protocol, apiKey }: McpServer.Spec): McpServer.Spec => ({
  ...(name !== undefined && { name }),
  url,
  protocol,
  ...(apiKey !== undefined && { apiKey }),
});
