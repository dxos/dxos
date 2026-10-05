//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { SchemaAST } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { type Channel } from '@dxos/types';

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

/** The contributed provider for a channel, or a typed failure naming the missing kind. */
export const getProvider = (
  channel: Channel.Channel,
): Effect.Effect<ThreadCapabilities.ChannelBackendProvider, ChannelBackendNotFoundError, Capability.Service> =>
  Effect.gen(function* () {
    const providers = yield* Capability.getAll(ThreadCapabilities.ChannelBackend);
    const provider = resolveProvider(providers, channel.backend.kind);
    if (!provider) {
      return yield* Effect.fail(new ChannelBackendNotFoundError({ context: { kind: channel.backend.kind } }));
    }
    return provider;
  });

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
