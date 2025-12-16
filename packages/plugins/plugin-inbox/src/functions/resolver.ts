//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Schema from 'effect/Schema';

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
    resolve<T, I>(schema: Schema.Schema<T, any>, input: I): Effect.Effect<T | undefined>;
  }
>() {}

export const resolve = <T, I>(schema: Schema.Schema<T, any>, input: I) =>
  Effect.flatMap(Resolver, (service) => service.resolve(schema, input));

export const fromResolvers = (resolvers: ResolverMap) =>
  Layer.succeed(
    Resolver,
    Resolver.of({
      resolve: (schema, input: any) => {
        const typename = Type.getTypename(schema);
        const resolver = resolvers[typename];
        if (resolver) {
          return resolver(input);
        }

        return Effect.succeed(undefined);
      },
    }),
  );
