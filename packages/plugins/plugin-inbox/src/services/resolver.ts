//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Type } from '@dxos/echo';

// TODO(wittjosiah): Factor out.

export type ResolverType<T, I> = (input: I) => Effect.Effect<T | undefined>;

export type ResolverMap = Record<string, ResolverType<any, any>>;

/**
 * Service for resolving objects from external data.
 */
export class Resolver extends Context.Tag('PluginInbox/Resolver')<
  Resolver,
  {
    resolve<T extends Type.AnyEntity, I>(type: T, input: I): Effect.Effect<Type.InstanceType<T> | undefined>;
  }
>() {}

export const resolve = <T extends Type.AnyEntity, I>(type: T, input: I) =>
  Effect.flatMap(Resolver, (service) =>
    Effect.map(service.resolve<T, I>(type, input), (result) => result ?? undefined),
  );

export const fromResolvers = (resolvers: ResolverMap) =>
  Layer.succeed(
    Resolver,
    Resolver.of({
      resolve: (type, input: any) => {
        const typename = Type.getTypename(type);
        const resolver = resolvers[typename];
        if (resolver) {
          return resolver(input);
        }

        return Effect.succeed(undefined);
      },
    }),
  );
