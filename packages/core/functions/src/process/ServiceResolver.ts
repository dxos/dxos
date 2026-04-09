//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Scope from 'effect/Scope';

import type { DXN, SpaceId } from '@dxos/keys';

import { ServiceNotAvailableError } from '../errors';
import * as Process from './Process';

const ServiceResolverTypeId = '~@dxos/functions/ServiceResolver' as const;
type ServiceResolverTypeId = typeof ServiceResolverTypeId;

export interface ServiceResolver {
  readonly [ServiceResolverTypeId]: ServiceResolverTypeId;

  /**
   * Resolve a set of services identified by their tags.
   * Returns a Context containing all requested services, or fails with ServiceNotAvailableError.
   */
  resolve<Tag extends Context.Tag<any, any>>(
    tag: Tag,
    context: ResolutionContext,
  ): Effect.Effect<Context.Tag.Service<Tag>, ServiceNotAvailableError, Scope.Scope>;
}

/**
 * Tag for the ServiceResolver service.
 */
export const ServiceResolver = Context.GenericTag<ServiceResolver>('@dxos/functions/ServiceResolver');

export const resolve = Effect.serviceFunctionEffect(ServiceResolver, (_) => _.resolve);

export const resolveAll = <const Tags extends readonly Context.Tag<any, any>[]>(
  tags: Tags,
  context: ResolutionContext,
): Effect.Effect<Context.Context<Tags[number]>, ServiceNotAvailableError, Scope.Scope | ServiceResolver> =>
  Effect.gen(function* () {
    const services = yield* Effect.forEach(tags, (tag) =>
      resolve(tag, context).pipe(Effect.map((service) => Context.make(tag, service))),
    );
    return Context.mergeAll(...services);
  });

/**
 * Provides context for service resolution.
 */
export interface ResolutionContext {
  /**
   * Under which identity the process is running.
   */
  readonly identity?: string;

  /**
   * Under which space the process is running.
   */
  readonly space?: SpaceId;

  /**
   * DXN of the conversation feed the process is running in.
   */
  readonly conversation?: DXN.String;

  /**
   * Under which process the process is running.
   */
  readonly process?: Process.ID;
}

export const succeed = <I, S>(
  tag: Context.Tag<I, S>,
  getService: (context: ResolutionContext) => Effect.Effect<S, ServiceNotAvailableError, Scope.Scope>,
): ServiceResolver => {
  return make((tag1, context) => {
    if (tag1.key !== tag.key) {
      return Effect.fail(new ServiceNotAvailableError(`Service not available: ${String(tag.key ?? tag)}`));
    }
    const service = getService(context);
    return service as any;
  });
};

/**
 * Create a ServiceResolver from a custom resolution function.
 */
export const make = (
  resolveFn: <I, S>(
    tag: Context.Tag<I, S>,
    context: ResolutionContext,
  ) => Effect.Effect<S, ServiceNotAvailableError, Scope.Scope>,
): ServiceResolver => ({
  [ServiceResolverTypeId]: ServiceResolverTypeId,
  resolve: resolveFn,
});

/**
 * Create a ServiceResolver backed by a static Context.
 * Tags present in the context are resolved; missing tags fail with ServiceNotAvailableError.
 */
export const fromContext = (ctx: Context.Context<any>): ServiceResolver =>
  make((tag, context) =>
    Effect.gen(function* () {
      const service = Context.getOption(ctx, tag);
      if (Option.isNone(service)) {
        return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
      }
      return service.value;
    }),
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
    return make((tag, context) =>
      Effect.gen(function* () {
        let result: Context.Context<never> = Context.empty() as Context.Context<never>;
        if (!available.has(tag.key)) {
          return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
        }
        const service = Context.getOption(parentCtx, tag);
        if (Option.isNone(service)) {
          return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
        }
        return service.value;
      }),
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
  make((tag, context) =>
    Effect.gen(function* () {
      for (const resolver of resolvers) {
        const single = yield* resolver.resolve(tag, context).pipe(Effect.either);
        if (Either.isRight(single)) {
          return single.right;
        }
      }

      return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
    }),
  );

/**
 * An empty resolver that fails for any requested service.
 */
export const empty: ServiceResolver = make((tag, context) => {
  return Effect.fail(new ServiceNotAvailableError(String(tag.key ?? tag)));
});
