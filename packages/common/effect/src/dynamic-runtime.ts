//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import type * as Fiber from 'effect/Fiber';
import type * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';
import * as Runtime from 'effect/Runtime';

import { unwrapExit } from './errors';

/**
 * Helper type to construct a union of tag identifiers from an array of tags.
 */
export type TagsToContext<Tags extends ReadonlyArray<Context.Tag<any, any>>> = Tags extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head extends Context.Tag<infer Id, any>
    ? Tail extends ReadonlyArray<Context.Tag<any, any>>
      ? Id | TagsToContext<Tail>
      : Id
    : never
  : never;

/**
 * A runtime wrapper that validates required tags are available at runtime
 * while providing type-level guarantees that effects require those tags.
 */
export interface DynamicRuntime<Tags extends ReadonlyArray<Context.Tag<any, any>>> {
  /**
   * Run an effect as a promise that requires the specified tags.
   */
  readonly runPromise: <A, E>(effect: Effect.Effect<A, E, TagsToContext<Tags>>) => Promise<A>;

  /**
   * Run an effect synchronously that requires the specified tags.
   */
  readonly runSync: <A, E>(effect: Effect.Effect<A, E, TagsToContext<Tags>>) => A;

  /**
   * Run an effect synchronously returning exit that requires the specified tags.
   */
  readonly runSyncExit: <A, E>(effect: Effect.Effect<A, E, TagsToContext<Tags>>) => Exit.Exit<A, E>;

  /**
   * Run an effect as a promise returning exit that requires the specified tags.
   */
  readonly runPromiseExit: <A, E>(effect: Effect.Effect<A, E, TagsToContext<Tags>>) => Promise<Exit.Exit<A, E>>;

  /**
   * Fork an effect that requires the specified tags.
   */
  readonly runFork: <A, E>(effect: Effect.Effect<A, E, TagsToContext<Tags>>) => Fiber.RuntimeFiber<A, E>;

  /**
   * Get the runtime as an effect that requires the specified tags.
   */
  readonly runtimeEffect: Effect.Effect<Runtime.Runtime<TagsToContext<Tags>>, never, never>;

  /**
   * Dispose the underlying managed runtime.
   */
  readonly dispose: () => Promise<void>;

  /**
   * Get the underlying managed runtime.
   */
  readonly managedRuntime: ManagedRuntime.ManagedRuntime<any, any>;
}

/**
 * Validate that all required tags are present in the runtime context.
 */
const validateTags = <Tags extends ReadonlyArray<Context.Tag<any, any>>>(
  context: Context.Context<any>,
  tags: Tags,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const missingTags: string[] = [];
    for (const tag of tags) {
      const option = Context.getOption(context, tag);
      if (Option.isNone(option)) {
        missingTags.push(tag.key);
      }
    }

    if (missingTags.length > 0) {
      return yield* Effect.die(new Error(`Missing required tags in runtime: ${missingTags.join(', ')}`));
    }
  });

/**
 * Create a dynamic runtime from a managed runtime and validate required tags.
 */
export function make<const Tags extends ReadonlyArray<Context.Tag<any, any>>>(
  managedRuntime: ManagedRuntime.ManagedRuntime<any, any> | ManagedRuntime.ManagedRuntime<never, never>,
  tags: Tags,
): DynamicRuntime<Tags> {
  type RequiredContext = TagsToContext<Tags>;
  const managedRuntimeAny = managedRuntime as ManagedRuntime.ManagedRuntime<any, any>;

  // Cache validated runtime for async operations
  let validatedRuntimePromise: Promise<Runtime.Runtime<RequiredContext>> | undefined;

  const getValidatedRuntimeAsync = async (): Promise<Runtime.Runtime<RequiredContext>> => {
    if (!validatedRuntimePromise) {
      validatedRuntimePromise = managedRuntimeAny.runPromise(
        Effect.gen(function* () {
          const rt = yield* managedRuntimeAny.runtimeEffect;
          yield* validateTags(rt.context, tags);
          return rt as Runtime.Runtime<RequiredContext>;
        }),
      );
    }
    return validatedRuntimePromise;
  };

  // Get validated runtime for sync operations
  const getValidatedRuntime = (): Runtime.Runtime<RequiredContext> => {
    const validationExit = managedRuntimeAny.runSyncExit(
      Effect.gen(function* () {
        const rt = yield* managedRuntimeAny.runtimeEffect;
        yield* validateTags(rt.context, tags);
        return rt as Runtime.Runtime<RequiredContext>;
      }),
    );
    return unwrapExit(validationExit);
  };

  return {
    managedRuntime: managedRuntimeAny,
    runPromise: async <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Promise<A> => {
      const runtime = await getValidatedRuntimeAsync();
      return Runtime.runPromise(runtime)(effect);
    },
    runSync: <A, E>(effect: Effect.Effect<A, E, RequiredContext>): A => {
      const runtime = getValidatedRuntime();
      return Runtime.runSync(runtime)(effect);
    },
    runSyncExit: <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Exit.Exit<A, E> => {
      const validationExit = managedRuntimeAny.runSyncExit(
        Effect.gen(function* () {
          const rt = yield* managedRuntimeAny.runtimeEffect;
          yield* validateTags(rt.context, tags);
          return rt as Runtime.Runtime<RequiredContext>;
        }),
      );
      if (Exit.isSuccess(validationExit)) {
        const runtime = validationExit.value;
        return Runtime.runSyncExit(runtime)(effect);
      }
      return validationExit as Exit.Exit<A, E>;
    },
    runPromiseExit: async <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Promise<Exit.Exit<A, E>> => {
      try {
        const runtime = await getValidatedRuntimeAsync();
        return Runtime.runPromiseExit(runtime)(effect);
      } catch (error) {
        // If validation failed, return a failure exit
        return Exit.die(error);
      }
    },
    runFork: <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Fiber.RuntimeFiber<A, E> => {
      const runtime = getValidatedRuntime();
      return Runtime.runFork(runtime)(effect);
    },
    runtimeEffect: Effect.gen(function* () {
      const rt = yield* managedRuntimeAny.runtimeEffect;
      yield* validateTags(rt.context, tags);
      return rt as Runtime.Runtime<RequiredContext>;
    }).pipe(
      Effect.catchAll(() =>
        // This should never happen since validateTags uses Effect.die
        Effect.die(new Error('Unexpected error in runtimeEffect validation')),
      ),
    ),
    dispose: async (): Promise<void> => {
      await managedRuntimeAny.dispose();
    },
  };
}
