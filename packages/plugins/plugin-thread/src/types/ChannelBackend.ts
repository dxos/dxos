//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { type Database, type Feed, Filter, Query } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { BaseError } from '@dxos/errors';
import { type Channel, Message, type Person } from '@dxos/types';

import * as ThreadCapabilities from './ThreadCapabilities.ts';
import type * as ThreadOperation from './ThreadOperation.ts';

/** No contributed provider handles the channel's `backend.kind` (its plugin is disabled or absent). */
export class ChannelBackendNotFoundError extends BaseError.extend(
  'ChannelBackendNotFoundError',
  'No channel backend handles this channel.',
) {}

/** The channel's backend lacks an optional member the caller needs (`openDirect`, `threads`, `connection`). */
export class ChannelBackendUnsupportedError extends BaseError.extend(
  'ChannelBackendUnsupportedError',
  'The channel backend does not support this.',
) {}

/** Finds the provider matching a `Channel.backend.kind`. */
export const resolveProvider = (
  providers: readonly ThreadCapabilities.ChannelBackendProvider[],
  kind: string,
): ThreadCapabilities.ChannelBackendProvider | undefined => providers.find((provider) => provider.kind === kind);

/** The contributed provider for a channel, or undefined when none is visible here. */
export const findProvider = (
  channel: Channel.Channel,
): Effect.Effect<ThreadCapabilities.ChannelBackendProvider | undefined, never, Capability.Service> =>
  Capability.getAll(ThreadCapabilities.ChannelBackend).pipe(
    Effect.map((providers) => resolveProvider(providers, channel.backend.kind)),
  );

/** The contributed provider for a channel, or a typed failure naming the missing kind. */
export const getProvider: (
  channel: Channel.Channel,
) => Effect.Effect<ThreadCapabilities.ChannelBackendProvider, ChannelBackendNotFoundError, Capability.Service> =
  Effect.fnUntraced(function* (channel) {
    const provider = yield* findProvider(channel);
    if (!provider) {
      return yield* Effect.fail(new ChannelBackendNotFoundError({ context: { kind: channel.backend.kind } }));
    }
    return provider;
  });

/**
 * Invokes one of the channel backend's own {@link ThreadOperation.backendOperations}, for a backend whose capability
 * is not visible here. Any failure becomes `refused`'s outcome, as a backend refusal does: across bundles on EDGE a
 * missing handler or a transport failure does not arrive as a typed error, and the caller falls through to its next
 * route either way.
 */
export const invokeBackend = <I, O>(
  operation: Operation.Definition<I, O>,
  input: I,
  refused: (reason: string) => O,
): Effect.Effect<O, never, Operation.Service> =>
  Operation.invoke(operation, input).pipe(
    Effect.exit,
    Effect.flatMap((exit) => {
      if (Exit.isSuccess(exit)) {
        return Effect.succeed(exit.value);
      }
      if (Cause.hasInterruptsOnly(exit.cause)) {
        return Effect.interrupt;
      }
      const error = Cause.squash(exit.cause);
      const reason =
        error instanceof Error && error.name === 'NoHandlerError'
          ? new ChannelBackendNotFoundError().message
          : error instanceof Error
            ? error.message
            : String(error);
      return Effect.succeed(refused(reason));
    }),
  );

/** Narrows a provider to one that has the optional member `name`, or fails naming what is missing. */
export const requireMember = <K extends 'openDirect' | 'threads' | 'connection'>(
  provider: ThreadCapabilities.ChannelBackendProvider,
  name: K,
): Effect.Effect<NonNullable<ThreadCapabilities.ChannelBackendProvider[K]>, ChannelBackendUnsupportedError> => {
  const member = provider[name];
  return member === undefined
    ? Effect.fail(
        new ChannelBackendUnsupportedError({
          message: `The ${provider.label} channel backend does not support ${name}.`,
          context: { kind: provider.kind, member: name },
        }),
      )
    : Effect.succeed(member);
};

/** A provider's send result as a receipt; a backend with nothing to report yields an empty one. */
export const toReceipt = (result: ThreadCapabilities.SendResult): ThreadOperation.SendReceipt =>
  typeof result === 'object' ? result : {};

/** Posts text through a provider, to the channel or a thread inside it; a backend refusal is an outcome, not a failure. */
export const sendThrough = Effect.fnUntraced(function* (
  provider: ThreadCapabilities.ChannelBackendProvider,
  channel: Channel.Channel,
  thread: string | undefined,
  text: string,
) {
  const message = Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text }] });
  const send =
    thread === undefined
      ? provider.send(channel, message)
      : (yield* requireMember(provider, 'threads')).send(channel, thread, message);
  // The caller relays a refusal (closed DMs, missing permission) to whoever asked.
  return yield* send.pipe(
    Effect.map((result) => ({ delivered: true, ...toReceipt(result) })),
    Effect.catch((error) => Effect.succeed({ delivered: false, reason: error.message })),
  );
});

/** Opens a direct conversation through a provider; a person it cannot reach is an outcome, not a failure. */
export const openDirectThrough = Effect.fnUntraced(function* (
  provider: ThreadCapabilities.ChannelBackendProvider,
  channel: Channel.Channel,
  person: Person.Person,
) {
  const openDirect = yield* requireMember(provider, 'openDirect');
  return yield* openDirect(channel, person).pipe(
    Effect.map((thread): { thread?: string; reason?: string } =>
      thread === undefined
        ? { reason: `The person has no ${provider.label} handle the channel can reach.` }
        : { thread },
    ),
    Effect.catch((error) => Effect.succeed({ reason: error.message })),
  );
});

/**
 * Subscribes to the messages appended to a feed, firing immediately; returns the unsubscribe.
 * Shared by every backend whose messages live in (or are mirrored into) an ECHO feed.
 */
export const subscribeFeed = (
  db: Database.Database,
  feed: Feed.Feed,
  onMessages: (messages: readonly Message.Message[]) => void,
): (() => void) => {
  const result = db.query(Query.select(Filter.type(Message.Message)).from(feed));
  return result.subscribe(() => onMessages(result.results), { fire: true });
};

/** Throws if two providers share a `kind` (which would make resolution order-dependent). */
export const assertUniqueKinds = (providers: readonly ThreadCapabilities.ChannelBackendProvider[]): void => {
  const seen = new Set<string>();
  for (const provider of providers) {
    if (seen.has(provider.kind)) {
      throw new Error(`Duplicate channel backend kind: ${provider.kind}`);
    }
    seen.add(provider.kind);
  }
};

/**
 * Builds the create-channel form schema from the registered providers.
 *
 * With a single provider whose create-fields are empty the form is just a
 * `name` field (today's behaviour). With multiple providers (or extra fields)
 * it becomes `{ name?, backend: Union(<{ kind: Literal(p.kind) } & p.createFields>) }`,
 * which react-ui-form renders as a `kind` Select plus the selected branch's fields.
 */
export const buildChannelFormSchema = (
  providers: readonly ThreadCapabilities.ChannelBackendProvider[],
): Schema.Codec<any, any> => {
  assertUniqueKinds(providers);
  const needsSelector = providers.length > 1 || providers.some((provider) => fieldCount(provider.createFields) > 0);
  if (!needsSelector) {
    return Schema.Struct({ name: Schema.optional(Schema.String) });
  }

  // `SchemaAST.assignFields`, not `mapFields`: a provider's `createFields` is a `Codec`, which
  // carries no field literals for a struct operation.
  const branches = providers.map((provider) =>
    Schema.make<Schema.Codec<any, any>>(
      SchemaAST.assignFields(Schema.Struct({ kind: Schema.Literal(provider.kind) }).ast, provider.createFields.ast),
    ),
  );
  const backend = branches.length === 1 ? branches[0] : Schema.Union(branches);
  return Schema.Struct({
    name: Schema.optional(Schema.String),
    backend,
  });
};

const fieldCount = (schema: Schema.Codec<any, any>): number => SchemaAST.getPropertySignatures(schema.ast).length;
