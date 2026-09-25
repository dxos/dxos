//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import type * as Fiber from 'effect/Fiber';
import type * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';

import { runAndForwardErrors, unwrapExit } from './internal/errors.ts';

/**
 * Helper type to construct a union of tag identifiers from an array of tags.
 */
export type TagsToContext<Tags extends ReadonlyArray<Context.Key<any, any>>> = Tags extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Head extends Context.Key<infer Id, any>
    ? Tail extends ReadonlyArray<Context.Key<any, any>>
      ? Id | TagsToContext<Tail>
      : Id
    : never
  : never;

/**
 * A runtime wrapper that validates required tags are available at runtime
 * while providing type-level guarantees that effects require those tags.
 */
export interface DynamicRuntime<Tags extends ReadonlyArray<Context.Key<any, any>>> {
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
  readonly runFork: <A, E>(effect: Effect.Effect<A, E, TagsToContext<Tags>>) => Fiber.Fiber<A, E>;

  /**
   * Get the runtime as an effect that requires the specified tags.
   */
  readonly contextEffect: Effect.Effect<Context.Context<TagsToContext<Tags>>, never, never>;

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
const validateTags = <Tags extends ReadonlyArray<Context.Key<any, any>>>(
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
export function make<const Tags extends ReadonlyArray<Context.Key<any, any>>>(
  managedRuntime: ManagedRuntime.ManagedRuntime<any, any> | ManagedRuntime.ManagedRuntime<never, never>,
  tags: Tags,
): DynamicRuntime<Tags> {
  type RequiredContext = TagsToContext<Tags>;
  const managedRuntimeAny = managedRuntime as ManagedRuntime.ManagedRuntime<any, any>;

  // Cache for the validated runtime - once resolved, can be used synchronously.
  let cachedRuntime: Context.Context<RequiredContext> | undefined;

  // Cache validated runtime for async operations.
  let validatedRuntimePromise: Promise<Context.Context<RequiredContext>> | undefined;

  const getValidatedRuntimeAsync = async (): Promise<Context.Context<RequiredContext>> => {
    if (!validatedRuntimePromise) {
      validatedRuntimePromise = managedRuntimeAny.runPromise(
        Effect.gen(function* () {
          const rt = yield* managedRuntimeAny.contextEffect;
          yield* validateTags(rt, tags);
          return rt as Context.Context<RequiredContext>;
        }),
      );
    }
    return validatedRuntimePromise;
  };

  // Get validated runtime for sync operations.
  const getValidatedRuntime = (): Context.Context<RequiredContext> => {
    const validationExit = managedRuntimeAny.runSyncExit(
      Effect.gen(function* () {
        const rt = yield* managedRuntimeAny.contextEffect;
        yield* validateTags(rt, tags);
        return rt as Context.Context<RequiredContext>;
      }),
    );
    return unwrapExit(validationExit);
  };

  return {
    managedRuntime: managedRuntimeAny,
    runPromise: async <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Promise<A> => {
      const runtime = await getValidatedRuntimeAsync();
      return runAndForwardErrors(Effect.provideContext(effect, runtime));
    },
    runSync: <A, E>(effect: Effect.Effect<A, E, RequiredContext>): A => {
      const runtime = getValidatedRuntime();
      return Effect.runSync(Effect.provideContext(effect, runtime));
    },
    runSyncExit: <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Exit.Exit<A, E> => {
      const validationExit = managedRuntimeAny.runSyncExit(
        Effect.gen(function* () {
          const rt = yield* managedRuntimeAny.contextEffect;
          yield* validateTags(rt, tags);
          return rt as Context.Context<RequiredContext>;
        }),
      );
      if (Exit.isSuccess(validationExit)) {
        const runtime = validationExit.value;
        return Effect.runSyncExit(Effect.provideContext(effect, runtime));
      }
      return validationExit as Exit.Exit<A, E>;
    },
    runPromiseExit: async <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Promise<Exit.Exit<A, E>> => {
      try {
        const runtime = await getValidatedRuntimeAsync();
        return Effect.runPromiseExit(Effect.provideContext(effect, runtime));
      } catch (error) {
        // If validation failed, return a failure exit
        return Exit.die(error);
      }
    },
    runFork: <A, E>(effect: Effect.Effect<A, E, RequiredContext>): Fiber.Fiber<A, E> => {
      const runtime = getValidatedRuntime();
      return Effect.runFork(Effect.provideContext(effect, runtime));
    },
    contextEffect: Effect.gen(function* () {
      // Return cached runtime if available.
      if (cachedRuntime) {
        return cachedRuntime;
      }
      const rt = yield* managedRuntimeAny.contextEffect;
      yield* validateTags(rt, tags);
      const runtime = rt as Context.Context<RequiredContext>;
      // Cache for future sync calls.
      cachedRuntime = runtime;
      return runtime;
    }).pipe(
      Effect.catch(() =>
        // This should never happen since validateTags uses Effect.die
        Effect.die(new Error('Unexpected error in contextEffect validation')),
      ),
    ),
    dispose: async (): Promise<void> => {
      await managedRuntimeAny.dispose();
    },
  };
}
