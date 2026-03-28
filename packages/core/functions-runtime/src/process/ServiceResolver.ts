//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { ServiceNotAvailableError } from '../errors';

const ServiceResolverTypeId = '~@dxos/functions-runtime/ServiceResolver' as const;
type ServiceResolverTypeId = typeof ServiceResolverTypeId;

export interface ServiceResolver {
  readonly [ServiceResolverTypeId]: ServiceResolverTypeId;

  /**
   * Resolve a set of services identified by their tags.
   * Returns a Context containing all requested services, or fails with ServiceNotAvailableError.
   */
  resolve(tags: readonly Context.Tag<any, any>[]): Effect.Effect<Context.Context<never>, ServiceNotAvailableError>;
}

/**
 * Tag for the ServiceResolver service.
 */
export const ServiceResolver = Context.GenericTag<ServiceResolver>('@dxos/functions-runtime/ServiceResolver');

/**
 * Create a ServiceResolver from a custom resolution function.
 */
export const make = (
  resolveFn: (
    tags: readonly Context.Tag<any, any>[],
  ) => Effect.Effect<Context.Context<never>, ServiceNotAvailableError>,
): ServiceResolver => ({
  [ServiceResolverTypeId]: ServiceResolverTypeId,
  resolve: resolveFn,
});

/**
 * Create a ServiceResolver backed by a static Context.
 * Tags present in the context are resolved; missing tags fail with ServiceNotAvailableError.
 */
export const fromContext = (ctx: Context.Context<any>): ServiceResolver =>
  make((tags) =>
    Effect.sync(() => {
      let result: Context.Context<never> = Context.empty() as Context.Context<never>;
      for (const tag of tags) {
        const service = Context.getOption(ctx, tag);
        if (Option.isNone(service)) {
          return Effect.fail(
            new ServiceNotAvailableError({ message: `Service not available: ${(tag as any).key ?? tag}` }),
          );
        }
        result = Context.add(result, tag, service.value) as Context.Context<never>;
      }
      return Effect.succeed(result);
    }).pipe(Effect.flatten),
  );

/**
 * Create a ServiceResolver that resolves tags from the current Effect context.
 * Only the specified tags are available; requests for other tags fail.
 */
export const fromRequirements = <const Tags extends readonly Context.Tag<any, any>[]>(
  ...tags: Tags
): Effect.Effect<ServiceResolver, never, Context.Tag.Identifier<Tags[number]>> =>
  Effect.contextWith((parentCtx: Context.Context<any>) => {
    const available = new Set(tags.map((tag) => tag.key));
    return make((requestedTags) =>
      Effect.sync(() => {
        let result: Context.Context<never> = Context.empty() as Context.Context<never>;
        for (const tag of requestedTags) {
          if (!available.has(tag.key)) {
            return Effect.fail(new ServiceNotAvailableError({ message: `Service not available: ${tag.key ?? tag}` }));
          }
          const service = Context.getOption(parentCtx, tag);
          if (Option.isNone(service)) {
            return Effect.fail(new ServiceNotAvailableError({ message: `Service not available: ${tag.key ?? tag}` }));
          }
          result = Context.add(result, tag, service.value) as Context.Context<never>;
        }
        return Effect.succeed(result);
      }).pipe(Effect.flatten),
    );
  });

/**
 * Like {@link fromRequirements} but returns a Layer that provides ServiceResolver.
 */
export const layerRequirements = <const Tags extends readonly Context.Tag<any, any>[]>(
  ...tags: Tags
): Layer.Layer<ServiceResolver, never, Context.Tag.Identifier<Tags[number]>> =>
  Layer.effect(ServiceResolver, fromRequirements(...tags));

/**
 * Compose multiple resolvers left to right. Earlier resolvers take precedence:
 * the first resolver that can satisfy a tag wins.
 */
export const compose = (...resolvers: readonly ServiceResolver[]): ServiceResolver =>
  make((tags) =>
    Effect.gen(function* () {
      let result: Context.Context<never> = Context.empty() as Context.Context<never>;
      const remaining = [...tags];

      for (const resolver of resolvers) {
        if (remaining.length === 0) break;

        const stillNeeded = [...remaining];
        const resolved = yield* resolver.resolve(stillNeeded).pipe(
          Effect.map(Option.some),
          Effect.catchAll(() => Effect.succeed(Option.none<Context.Context<never>>())),
        );

        if (Option.isSome(resolved)) {
          result = Context.merge(result, resolved.value) as Context.Context<never>;
          remaining.length = 0;
          break;
        }

        const resolved1by1: Context.Tag<any, any>[] = [];
        for (const tag of stillNeeded) {
          const single = yield* resolver.resolve([tag]).pipe(
            Effect.map(Option.some),
            Effect.catchAll(() => Effect.succeed(Option.none<Context.Context<never>>())),
          );
          if (Option.isSome(single)) {
            result = Context.merge(result, single.value) as Context.Context<never>;
            resolved1by1.push(tag);
          }
        }

        for (const tag of resolved1by1) {
          const idx = remaining.findIndex((remainingTag) => remainingTag.key === tag.key);
          if (idx !== -1) remaining.splice(idx, 1);
        }
      }

      if (remaining.length > 0) {
        const names = remaining.map((tag) => tag.key ?? String(tag)).join(', ');
        return yield* Effect.fail(new ServiceNotAvailableError({ message: `Service not available: ${names}` }));
      }

      return result;
    }),
  );

/**
 * An empty resolver that fails for any requested service.
 */
export const empty: ServiceResolver = make((tags) => {
  if (tags.length === 0) {
    return Effect.succeed(Context.empty() as Context.Context<never>);
  }
  const names = tags.map((tag) => (tag as any).key ?? String(tag)).join(', ');
  return Effect.fail(new ServiceNotAvailableError({ message: `Service not available: ${names}` }));
});
