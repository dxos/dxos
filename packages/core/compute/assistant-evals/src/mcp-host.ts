//
// Copyright 2026 DXOS.org
//

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import { type IncomingMessage, type ServerResponse } from 'node:http';

import * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import { type Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import type { SpaceId } from '@dxos/keys';
import { McpServer } from '@dxos/mcp-server';
import * as LocalUpload from '@dxos/mcp-server/LocalUpload';

import { listenLoopback, loopbackUrl } from './loopback-server.ts';

/** Where the Streamable HTTP endpoint is mounted; the client dials this path, not the root. */
const PATH = '/mcp';

/** Reported in `initialize`; an eval asserts behavior, so nothing reads it back. */
const VERSION = '0.0.0-eval';

export type McpHost = {
  /** Streamable HTTP endpoint, ready to hand to a skill's `mcpServers` entry. */
  readonly url: string;
};

export type StartMcpHostOptions = {
  /** Skill definitions to serve; each must carry the `operations` behind its tool ids. */
  readonly skills: readonly Skill.Definition[];
  /**
   * Spaces a tool call may address. Omitted is unrestricted — which is what an eval wants, since the
   * server is started before the harness has a space to name.
   */
  readonly spaceIds?: readonly SpaceId[];
  /**
   * The harness runtime's own services, captured with `Effect.context` inside `harness.runPromise`.
   *
   * A thunk, read per call rather than at start: the invoke seam must reach the harness's own
   * client, or the agent's writes land in a different database than the scenario asserts on, and the
   * harness does not exist yet when the server is built.
   */
  readonly context: () => Context.Context<Operation.Service>;
  /**
   * The registry the surface reads, resolved per call.
   *
   * The harness's own client registry, exactly as `dx mcp serve`'s local host uses the CLI client's
   * — and never a second registry built here: constructing one rewrites the shared schema ASTs the
   * harness is already holding, and its next operation invocation then dies inside `Schema` with
   * "cannot read properties of undefined (reading 'encoding')".
   */
  readonly registry: () => Registry.Registry;
  /**
   * Serves `createUpload` over this stage, as `dx mcp serve` does. Omitted, the surface has no
   * upload tool at all — which is what the deployed worker's own tool, not this one, is for.
   */
  readonly uploads?: LocalUpload.Stage;
};

/**
 * Serves the projected MCP surface — `queryOperations` / `invokeOperation` / `loadSkill` — over
 * Streamable HTTP inside this process, dispatching into the caller's own operation invoker.
 *
 * In-process rather than `dx mcp serve` as a subprocess: an eval's space lives in the harness's own
 * client, which a second process cannot reach, and a CLI spawn would also make the eval depend on a
 * built binary and a bootstrapped profile. Every tool answers through `@dxos/mcp-server`'s own
 * dispatch functions against the harness's own registry, so what the eval measures is the deployed
 * surface's behavior — governance by skill, space resolution, input validation, ref qualification —
 * rather than a reimplementation.
 *
 * The transport is the MCP SDK's rather than effect's `McpServer.layerHttp`: registering the surface
 * through effect's MCP layer rewrites shared schema ASTs in place, after which the Composer
 * harness's next operation invocation dies inside `Schema` with "cannot read properties of undefined
 * (reading 'encoding')". Building the server before the harness does not avoid it — the damaged
 * schemas are ones both sides share — so the eval harness owns its transport instead.
 */
export const startMcpHost = ({
  skills,
  spaceIds,
  context,
  registry,
  uploads,
}: StartMcpHostOptions): Effect.Effect<McpHost, never, Scope.Scope> =>
  Effect.gen(function* () {
    const connect = async () => {
      const server = new Server({ name: McpServer.identity.name, version: VERSION }, { capabilities: { tools: {} } });
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: uploads ? [...TOOLS, CREATE_UPLOAD_TOOL] : TOOLS,
      }));
      server.setRequestHandler(CallToolRequestSchema, async (request) =>
        dispatch(registry(), skills, spaceIds, context, uploads, request.params.name, request.params.arguments ?? {}),
      );
      // Stateless, and therefore one server and transport per request: a transport with no session
      // id rejects the second request it sees, since it has no session to attribute it to.
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      return { server, transport };
    };

    const { port } = yield* listenLoopback((request, response) => handle(connect, request, response));
    return { url: loopbackUrl(port, PATH) };
  });

/**
 * Registers the served skills and the operations behind them in the host's registry, the way
 * `dx mcp serve`'s local host does — and only what is missing, so nothing a plugin already
 * contributed is re-registered under a second definition.
 */
export const registerSkills = (registry: Registry.Registry, skills: readonly Skill.Definition[]): void => {
  const registered = (key: string) => registry.getByURI(`dxn:${key.replace(/^dxn:/, '')}`) != null;
  registry.add([
    ...Operation.serializable(
      skills
        .flatMap((definition) => definition.operations ?? [])
        .filter((operation) => !registered(String(operation.meta.key))),
    ),
    ...skills.filter((definition) => !registered(String(definition.key))).map((definition) => definition.make()),
  ]);
};

/**
 * The surface as the client sees it.
 *
 * The descriptions are the server's own, so the text the model reads is the deployed one; the
 * parameter schemas are written out here because deriving them from the effect schemas would go
 * through the very AST rewrite this transport exists to avoid.
 */
const TOOLS = [
  {
    name: McpServer.QueryOperations.name,
    description: McpServer.QueryOperations.description,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Free-text search over the operations this server serves.' },
        skill: { type: 'string', description: 'Restrict the rows to one skill, by name.' },
        keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Look these operation keys up instead of searching.',
        },
      },
    },
  },
  {
    name: McpServer.InvokeOperation.name,
    description: McpServer.InvokeOperation.description,
    inputSchema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'Operation key, as given in a queryOperations row.' },
        input: { type: 'object', description: "Arguments matching the operation's input schema." },
        spaceId: { type: 'string', description: 'The space the call acts on.' },
      },
      required: ['key'],
    },
  },
  {
    name: McpServer.LoadSkill.name,
    description: McpServer.LoadSkill.description,
    inputSchema: {
      type: 'object' as const,
      properties: {
        skill: { type: 'string', description: 'Skill name; omit to list the skills this server offers.' },
      },
    },
  },
];

/** `createUpload`, written out for the same reason as {@link TOOLS}; offered only with a stage. */
const CREATE_UPLOAD_TOOL = {
  name: 'createUpload',
  // The effect tool's own description, so the model reads the text `dx mcp serve` sends.
  description: LocalUpload.CreateUpload.description,
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Filename to record on the resulting file object, e.g. capture.png.' },
      size: {
        type: 'number',
        description: 'Size of the file in bytes, if known. Used only to fail fast when it exceeds the limit.',
      },
    },
  },
};

type ToolResponse = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/** Runs one tool call through the server's own dispatch, in the caller's runtime context. */
const dispatch = async (
  registry: Registry.Registry,
  skills: readonly Skill.Definition[],
  spaceIds: readonly SpaceId[] | undefined,
  context: () => Context.Context<Operation.Service>,
  uploads: LocalUpload.Stage | undefined,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResponse> => {
  const program = Effect.gen(function* () {
    switch (name) {
      case CREATE_UPLOAD_TOOL.name: {
        if (!uploads) {
          return yield* Effect.fail(McpServer.failure('invalid_request', `Unknown tool: ${name}`));
        }
        if (typeof args.size === 'number' && args.size > LocalUpload.MAX_UPLOAD_BYTES) {
          return yield* Effect.fail(
            McpServer.failure(
              'invalid_request',
              `File is ${args.size} bytes; the limit is ${LocalUpload.MAX_UPLOAD_BYTES}.`,
            ),
          );
        }
        return yield* Effect.tryPromise({
          try: () => uploads.mint(typeof args.name === 'string' ? args.name : undefined),
          catch: (error) =>
            McpServer.failure('operation_failed', error instanceof Error ? error.message : String(error)),
        });
      }
      case McpServer.QueryOperations.name:
        return yield* McpServer.queryOperations(registry, args);
      case McpServer.LoadSkill.name:
        return yield* McpServer.loadSkillByName(registry, args.skill as string | undefined);
      case McpServer.InvokeOperation.name: {
        // Built per call, because the invoker it closes over is the harness's — which exists only
        // once the eval's harness has booted.
        const host = yield* McpServer.host({ skills, spaceIds });
        return yield* McpServer.invoke(registry, host, args as Parameters<typeof McpServer.invoke>[2]);
      }
      default:
        return yield* Effect.fail(McpServer.failure('invalid_request', `Unknown tool: ${name}`));
    }
  }).pipe(Effect.provide(Layer.succeedContext(context())), Effect.result);

  const result = await EffectEx.runPromise(program);
  if (result._tag === 'Failure') {
    // A tool failure, not a transport error: the model is meant to read it and correct the call.
    return { content: [{ type: 'text', text: JSON.stringify(result.failure) }], isError: true };
  }
  const output = result.success as Record<string, unknown>;
  return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
};

/** Routes one request to a transport of its own; anything off the endpoint path is a 404. */
const handle = async (
  connect: () => Promise<{ server: Server; transport: StreamableHTTPServerTransport }>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  if (!(request.url ?? '').startsWith(PATH)) {
    response.writeHead(404).end();
    return;
  }
  // The body is parsed here rather than by the transport: it takes a parsed body when given one, and
  // node's server parses nothing itself.
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString();
  const { server, transport } = await connect();
  // Closed when the response is done, not before: closing the transport is what ends the response
  // stream the SDK wrote into.
  response.on('close', () => {
    void transport.close();
    void server.close();
  });
  await transport.handleRequest(request, response, raw.length > 0 ? JSON.parse(raw) : undefined);
};
