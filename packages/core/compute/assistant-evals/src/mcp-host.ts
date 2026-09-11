//
// Copyright 2026 DXOS.org
//

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

import type * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import { type Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import type { SpaceId } from '@dxos/keys';
import { McpServer } from '@dxos/mcp-server';

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
 *
 * Scoped: the listener is torn down when the caller's scope closes, so a failed eval cannot leave a
 * port bound for the next one.
 */
export const startMcpHost = ({
  skills,
  spaceIds,
  context,
  registry,
}: StartMcpHostOptions): Effect.Effect<McpHost, never, Scope.Scope> =>
  Effect.gen(function* () {
    const connect = async () => {
      const server = new Server({ name: McpServer.identity.name, version: VERSION }, { capabilities: { tools: {} } });
      server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
      server.setRequestHandler(CallToolRequestSchema, async (request) =>
        dispatch(registry(), skills, spaceIds, context, request.params.name, request.params.arguments ?? {}),
      );
      // Stateless, and therefore one server and transport per request: a transport with no session
      // id rejects the second request it sees, since it has no session to attribute it to.
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      return { server, transport };
    };

    const listener = yield* Effect.acquireRelease(
      Effect.sync(() =>
        createServer((request, response) => {
          void handle(connect, request, response);
        }),
      ),
      (listener) =>
        Effect.promise(async () => {
          // Sockets first: a client holding its connection open would otherwise make `close` wait
          // for it.
          listener.closeAllConnections();
          await new Promise<void>((resolve) => listener.close(() => resolve()));
        }),
    );

    // Port 0, and the address read back after `listening`: a fixed port collides with whatever the
    // developer already has bound, and with a second eval running beside this one.
    const port = yield* Effect.callback<number>((resume) => {
      listener.once('listening', () => {
        const address = listener.address();
        resume(
          address !== null && typeof address === 'object'
            ? Effect.succeed(address.port)
            : Effect.die(new Error(`MCP host bound to an unexpected address: ${String(address)}`)),
        );
      });
      listener.listen(0, '127.0.0.1');
    });

    // Literal `127.0.0.1`, never `localhost`: the name resolves to `::1` first on Linux, which no
    // listener bound to the IPv4 loopback answers.
    return { url: `http://127.0.0.1:${port}${PATH}` };
  });

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
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResponse> => {
  const program = Effect.gen(function* () {
    switch (name) {
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
