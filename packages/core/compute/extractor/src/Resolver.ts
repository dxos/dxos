//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Type } from '@dxos/echo';

export type ResolverType<T, I> = (input: I) => Effect.Effect<T | undefined>;

export type ResolverMap = Record<string, ResolverType<any, any>>;

/**
 * Service for resolving existing ECHO objects from external/extracted data. Keyed by typename,
 * each resolver maps an identity input (e.g. `{ email }`, `{ domain }`) to an existing object
 * when one exists. This is the identity backbone shared by extractors (merge vs create) and by
 * deterministic mappers (e.g. calendar attendee email → Person).
 */
export class Resolver extends Context.Tag('@dxos/extractor/Resolver')<
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
        const resolver = typename ? resolvers[typename] : undefined;
        if (resolver) {
          return resolver(input);
        }

        return Effect.succeed(undefined);
      },
    }),
  );
