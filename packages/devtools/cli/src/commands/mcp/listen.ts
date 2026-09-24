//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig } from '@dxos/cli-util';

import { McpProtocolError, type McpSession, loadSession, refreshSession } from './client.ts';
import { requireSession, serverUrlOption } from './util.ts';

const PROTOCOL_VERSION = '2026-07-28';

/** Sent on every request in place of the 2025-era `initialize` handshake. */
const REQUEST_META = {
  'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
  'io.modelcontextprotocol/clientInfo': { name: 'dx-mcp-listen', version: '0.1.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};

const LISTEN_REQUEST_ID = 'dx-mcp-listen';

/** The `notifications` filter of a `subscriptions/listen` request, and of its acknowledgment. */
export const ListenFilter = Schema.Struct({
  toolsListChanged: Schema.optional(Schema.Boolean),
  promptsListChanged: Schema.optional(Schema.Boolean),
  resourcesListChanged: Schema.optional(Schema.Boolean),
  resourceSubscriptions: Schema.optional(Schema.Array(Schema.String)),
});
export type ListenFilter = Schema.Schema.Type<typeof ListenFilter>;

const LIST_CHANGED_FILTERS = ['toolsListChanged', 'promptsListChanged', 'resourcesListChanged'] as const;

/** What {@link listenEvents} yields: the server's acknowledgment once, then one entry per notification. */
export type ListenEvent =
  | { readonly kind: 'acknowledged'; readonly notifications: ListenFilter }
  | {
      readonly kind: 'notification';
      readonly method: string;
      readonly uri?: string;
      /** The resource's contents, read back after `notifications/resources/updated` unless disabled. */
      readonly contents?: unknown;
      /** Why the read-back failed, in place of `contents`. */
      readonly error?: string;
    };

export type ListenOptions = {
  /** The server's MCP endpoint. */
  readonly endpoint: string;
  readonly notifications: ListenFilter;
  readonly token?: string;
  /** Called once when the server answers 401; returns the token to retry with. */
  readonly refreshToken?: () => Promise<string>;
  /** Read each updated resource back, since `notifications/resources/updated` carries only its URI. */
  readonly read?: boolean;
  /** Replaces the global `fetch`, so a test can reach an in-process server. */
  readonly fetch?: (url: string, init: RequestInit) => Promise<Response>;
};

const Message = Schema.Struct({
  // `null` is what a server sends back for a request it could not parse.
  id: Schema.optional(Schema.NullOr(Schema.Union([Schema.String, Schema.Number]))),
  method: Schema.optional(Schema.String),
  params: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.Unknown),
  result: Schema.optional(Schema.Unknown),
});
type Message = Schema.Schema.Type<typeof Message>;

/** The listen request's own response, as opposed to a server request that reuses its id. */
const isListenResponse = (message: Message): boolean =>
  message.id === LISTEN_REQUEST_ID && message.method === undefined;

/** A named field of a message's `params`, which JSON-RPC also allows to be positional. */
const param = (message: Message, key: string): unknown =>
  Predicate.hasProperty(message.params, key) ? message.params[key] : undefined;

const ReadResult = Schema.Struct({ contents: Schema.Array(Schema.Unknown) });

/**
 * Holds a `subscriptions/listen` stream open against a 2026-07-28 MCP server over Streamable HTTP.
 *
 * The stream ends when the server closes the subscription with a response to the listen request.
 * It fails when the server refuses the request or sends a malformed message, and when the body
 * ends without that response — a dropped connection, not a close — so a watcher never mistakes a
 * dead feed for a quiet one. A resource that cannot be read back is reported on its own event.
 */
export const listenEvents = (options: ListenOptions): Stream.Stream<ListenEvent, McpProtocolError> => {
  let token = options.token;
  let readCount = 0;
  let closed = false;

  const post = (method: string, params: Record<string, unknown>, id: string, name?: string) =>
    Effect.tryPromise({
      try: async () => {
        const send = () =>
          (options.fetch ?? fetch)(options.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Streamable HTTP servers answer 406 unless both media types are acceptable.
              'Accept': 'application/json, text/event-stream',
              // The 2026-07-28 transport routes on these headers and rejects a request whose headers and body disagree.
              'MCP-Protocol-Version': PROTOCOL_VERSION,
              'Mcp-Method': method,
              ...(name !== undefined && { 'Mcp-Name': encodeRoutingHeader(name) }),
              ...(token !== undefined && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ jsonrpc: '2.0', id, method, params: { ...params, _meta: REQUEST_META } }),
          });

        let response = await send();
        if (response.status === 401 && options.refreshToken) {
          token = await options.refreshToken();
          response = await send();
        }
        if (response.status !== 200) {
          throw new McpProtocolError({
            message: `MCP ${method} failed (${response.status}): ${await response.text()}`,
          });
        }
        return response;
      },
      catch: (error) =>
        error instanceof McpProtocolError
          ? error
          : new McpProtocolError({ message: `MCP ${method} failed`, cause: error }),
    });

  const readResource = (uri: string) =>
    Effect.gen(function* () {
      const id = `${LISTEN_REQUEST_ID}-read-${++readCount}`;
      const response = yield* post('resources/read', { uri }, id, uri);
      const reply = yield* messages(response).pipe(
        Stream.filter((message) => message.id === id),
        Stream.runHead,
      );
      if (Option.isNone(reply) || reply.value.error !== undefined) {
        return yield* Effect.fail(
          new McpProtocolError({
            message: `MCP resources/read ${uri} failed: ${JSON.stringify(Option.getOrUndefined(reply)?.error)}`,
          }),
        );
      }
      return yield* Schema.decodeUnknownEffect(ReadResult)(reply.value.result).pipe(
        Effect.map((result) => result.contents),
        Effect.mapError(
          (cause) => new McpProtocolError({ message: `Invalid resources/read result for ${uri}`, cause }),
        ),
      );
    });

  const toEvents = (message: Message): Effect.Effect<ReadonlyArray<ListenEvent>, McpProtocolError> =>
    Effect.gen(function* () {
      if (isListenResponse(message)) {
        closed = true;
        if (message.error !== undefined) {
          return yield* Effect.fail(
            new McpProtocolError({ message: `MCP subscriptions/listen failed: ${JSON.stringify(message.error)}` }),
          );
        }
        return [];
      }
      if (message.method === 'notifications/subscriptions/acknowledged') {
        const notifications = yield* Schema.decodeUnknownEffect(ListenFilter)(param(message, 'notifications')).pipe(
          Effect.mapError((cause) => new McpProtocolError({ message: 'Invalid subscription acknowledgment', cause })),
        );
        return [{ kind: 'acknowledged', notifications }];
      }
      if (message.method === undefined || message.id !== undefined) {
        return [];
      }
      const method = message.method;
      const value = param(message, 'uri');
      const uri = typeof value === 'string' ? value : undefined;
      if (method !== 'notifications/resources/updated' || uri === undefined || options.read === false) {
        return [{ kind: 'notification', method, uri }];
      }
      // One unreadable resource must not end a long-running watch.
      return yield* readResource(uri).pipe(
        Effect.match({
          onSuccess: (contents): ReadonlyArray<ListenEvent> => [{ kind: 'notification', method, uri, contents }],
          onFailure: (error): ReadonlyArray<ListenEvent> => [
            { kind: 'notification', method, uri, error: error.message },
          ],
        }),
      );
    });

  return post('subscriptions/listen', { notifications: options.notifications }, LISTEN_REQUEST_ID).pipe(
    Effect.map((response) =>
      messages(response).pipe(
        // The listen request's own response closes the subscription; it is the last message that matters.
        Stream.takeUntil(isListenResponse),
        Stream.mapEffect(toEvents),
        Stream.concat(
          Stream.fromEffect(
            Effect.suspend(() =>
              closed
                ? Effect.succeed([])
                : Effect.fail(new McpProtocolError({ message: 'MCP subscriptions/listen stream ended unexpectedly' })),
            ),
          ),
        ),
        Stream.flattenIterable,
      ),
    ),
    Stream.unwrap,
  );
};

/** Every JSON-RPC message of a response body, whether plain JSON or an open-ended event stream. */
const messages = (response: Response): Stream.Stream<Message, McpProtocolError> => {
  const body = response.body;
  if (body === null) {
    return Stream.empty;
  }
  const isEventStream =
    response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === 'text/event-stream';
  const payloads: Stream.Stream<string, McpProtocolError> = isEventStream
    ? Stream.fromReadableStream({
        evaluate: () => body,
        onError: (cause) => new McpProtocolError({ message: 'MCP event stream failed', cause }),
      }).pipe(
        Stream.decodeText,
        Stream.splitLines,
        Stream.mapAccum((): string[] => [], collectEventData, { onHalt: flushEventData }),
      )
    : Stream.fromEffect(
        Effect.tryPromise({
          try: () => response.text(),
          catch: (cause) => new McpProtocolError({ message: 'MCP response body failed', cause }),
        }),
      );

  return payloads.pipe(
    Stream.mapEffect((payload) =>
      Effect.try({
        try: (): unknown => JSON.parse(payload),
        catch: (cause) => new McpProtocolError({ message: 'MCP sent a message that is not JSON', cause }),
      }),
    ),
    // A payload may be a JSON-RPC batch.
    Stream.flatMap((parsed) => Stream.fromIterable(Array.isArray(parsed) ? parsed : [parsed])),
    Stream.mapEffect((value) =>
      Schema.decodeUnknownEffect(Message)(value).pipe(
        Effect.mapError((cause) => new McpProtocolError({ message: 'MCP sent a malformed JSON-RPC message', cause })),
      ),
    ),
  );
};

/** Accumulates an event's `data:` lines and emits them joined at the blank line that ends it, as the SSE spec does. */
const collectEventData = (data: string[], line: string): readonly [string[], ReadonlyArray<string>] => {
  if (line === '') {
    return [[], flushEventData(data)];
  }
  if (line.startsWith('data:')) {
    return [[...data, line.slice(line.startsWith('data: ') ? 6 : 5)], []];
  }
  return [data, []];
};

const flushEventData = (data: string[]): ReadonlyArray<string> => (data.length > 0 ? [data.join('\n')] : []);

/**
 * `Mcp-Name` must be a visible-ASCII header value that survives `fetch` trimming it; anything else
 * travels base64-encoded in a sentinel.
 */
const encodeRoutingHeader = (value: string): string =>
  /^[\x20-\x7e]*$/.test(value) && value === value.trim()
    ? value
    : `=?base64?${Buffer.from(value, 'utf8').toString('base64')}?=`;

/**
 * Resolves the endpoint and credentials: a stored `dx mcp connect` session when there is one for
 * the server, otherwise no credentials, so an unauthenticated server works too. Either way the
 * endpoint is the server's `/mcp`, matching the URLs `dx mcp connect` accepts.
 */
const resolveTarget = (profile: string, url: Option.Option<string>) =>
  Effect.gen(function* () {
    if (Option.isNone(url)) {
      return fromSession(profile, yield* requireSession(profile, url));
    }
    const endpoint = `${url.value.replace(/\/(mcp)?$/, '')}/mcp`;
    // Sessions are stored per host, so the requested path wins over the one the session was made for.
    const session = yield* loadSession(profile, url.value);
    return session === undefined ? { endpoint } : { ...fromSession(profile, session), endpoint };
  });

const fromSession = (
  profile: string,
  session: McpSession,
): Pick<ListenOptions, 'endpoint' | 'token' | 'refreshToken'> => {
  let current = session;
  return {
    endpoint: `${session.serverUrl}/mcp`,
    token: session.accessToken,
    refreshToken: session.refreshToken
      ? async () => {
          current = await refreshSession(current, { profile });
          return current.accessToken;
        }
      : undefined,
  };
};

/**
 * `dx mcp listen`: prints one JSON line per notification on stdout and everything else on stderr,
 * so a watcher that wakes an agent per line wakes it only for events.
 */
export const listen = Command.make(
  'listen',
  {
    url: serverUrlOption,
    resource: Options.String('resource').pipe(
      Options.withDescription('Resource URI to watch for `notifications/resources/updated`; repeatable.'),
      Options.atLeast(0),
    ),
    listChanged: Options.Boolean('list-changed').pipe(
      Options.withDescription('Also report tools, prompts and resources list changes.'),
      Options.withDefault(false),
    ),
    uriOnly: Options.Boolean('uri-only').pipe(
      Options.withDescription('Print only the URI of an updated resource instead of reading it back.'),
      Options.withDefault(false),
    ),
  },
  Effect.fn(function* ({ url, resource, listChanged, uriOnly }) {
    if (resource.length === 0 && !listChanged) {
      return yield* Effect.fail(
        new McpProtocolError({ message: 'Nothing to listen for: pass --resource <uri> and/or --list-changed.' }),
      );
    }
    const { profile } = yield* CommandConfig;
    const target = yield* resolveTarget(profile, url);
    const notifications: ListenFilter = {
      ...(resource.length > 0 && { resourceSubscriptions: resource }),
      ...(listChanged && { toolsListChanged: true, promptsListChanged: true, resourcesListChanged: true }),
    };

    yield* listenEvents({ ...target, notifications, read: !uriOnly }).pipe(
      Stream.runForEach((event) =>
        Effect.gen(function* () {
          if (event.kind === 'acknowledged') {
            const refused = resource.filter((uri) => !event.notifications.resourceSubscriptions?.includes(uri));
            if (refused.length > 0) {
              return yield* Effect.fail(
                new McpProtocolError({
                  message: `Server refused subscriptions to ${refused.join(', ')}; does it declare resources?`,
                }),
              );
            }
            const unsupported = listChanged
              ? LIST_CHANGED_FILTERS.filter((filter) => event.notifications[filter] !== true)
              : [];
            // Status goes to stderr: a watcher wakes its agent on every stdout line, and this is not an event.
            if (unsupported.length > 0) {
              yield* Console.error(`server does not report: ${unsupported.join(', ')}`);
            }
            return yield* Console.error(`listening: ${JSON.stringify(event.notifications)}`);
          }
          const { kind: _, ...line } = event;
          yield* Console.log(JSON.stringify(line));
        }),
      ),
    );
    yield* Console.error('subscription closed by the server');
  }),
).pipe(
  Command.withDescription(
    'Hold a `subscriptions/listen` stream open on a 2026-07-28 MCP server and print one JSON line per notification. ' +
      "Run it under an agent's background monitor (e.g. Claude Code's Monitor tool) so each event wakes the agent.",
  ),
);
