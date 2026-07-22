//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import { Command } from '@tauri-apps/plugin-shell';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';

import { type AiModelResolver, Provider } from '@dxos/ai';
import { OllamaAdmin, OllamaResolver } from '@dxos/ai/resolvers';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { AssistantCapabilities, type Ollama } from '@dxos/plugin-assistant';

// NOTE: Running ollama on non-standard port (config Tauri).
const OLLAMA_HOST = 'http://localhost:21434';

export type OllamaCapabilities =
  | Capability.Capability<typeof AppCapabilities.AiModelResolver>
  | Capability.Capability<typeof AssistantCapabilities.OllamaManager>;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;

    const runtime = ManagedRuntime.make(OllamaSidecar.layerLive);

    // Layer for the sidecar but the lifecycle is managed by the runtime.
    const sidecarLayer = Layer.effectContext(
      runtime.runtimeEffect.pipe(Effect.map((rt) => rt.context.pipe(Context.pick(OllamaSidecar)))),
    );

    const admin = OllamaAdmin.make({ endpoint: OLLAMA_HOST });
    const stateAtom = Atom.make<Ollama.ModelsState>({
      kind: 'idle',
      models: [],
      loaded: [],
      pulls: {},
      errors: {},
    }).pipe(Atom.keepAlive);

    // Read/update the reactive state atom as Effects.
    const getState = Effect.sync(() => registry.get(stateAtom));
    const updateState = (f: (state: Ollama.ModelsState) => Ollama.ModelsState): Effect.Effect<void> =>
      Effect.sync(() => registry.set(stateAtom, f(registry.get(stateAtom))));

    // Connection-level failure (reaching the service); shown at the section, not tied to a model.
    const fail = (error: string): Effect.Effect<void> => updateState((state) => ({ ...state, kind: 'failed', error }));

    // Per-model action error (load/unload/remove/pull); shown inline on that model's row. Pass
    // `undefined` to clear.
    const setError = (name: string, error: string | undefined): Effect.Effect<void> =>
      updateState((state) => {
        const errors = { ...state.errors };
        if (error) {
          errors[name] = error;
        } else {
          delete errors[name];
        }
        return { ...state, errors };
      });

    // Write (or clear, when `progress` is undefined) the in-flight progress for `name`.
    const setProgress = (name: string, progress: OllamaAdmin.PullProgress | undefined): Effect.Effect<void> =>
      updateState((state) => {
        const pulls = { ...state.pulls };
        if (progress) {
          pulls[name] = progress;
        } else {
          delete pulls[name];
        }
        return { ...state, pulls };
      });

    // Force the scoped sidecar layer, spawning the process idempotently — the runtime is lazy and
    // only spawns on first force, so opening settings starts Ollama rather than hitting a refused
    // connection, and a chat already using the resolver does not spawn a second process. The endpoint
    // is unused; forcing `OllamaSidecar` is what triggers the spawn. Failures surface as defects.
    const ensureRunning: Effect.Effect<void> = Effect.asVoid(OllamaSidecar).pipe(Effect.provide(sidecarLayer));

    // Run an admin effect with the HttpClient provided, folding its typed failure into an Either so
    // callers branch on the result without a typed error channel.
    const runAdmin = <A, E extends { readonly message: string }>(
      effect: Effect.Effect<A, E, HttpClient.HttpClient>,
    ): Effect.Effect<Either.Either<A, string>> =>
      effect.pipe(Effect.provide(clientLayer), Effect.either, Effect.map(Either.mapLeft((error) => error.message)));

    // In-flight pull fibers, so a pull can be cancelled via interruption.
    const pullFibers = new Map<string, Fiber.RuntimeFiber<void>>();

    // Refresh only the loaded-into-memory set (cheap; no spawn). Logs load/unload transitions so the
    // console reflects which model is resident when a chat request triggers a load.
    const refreshLoaded: Effect.Effect<void> = Effect.gen(function* () {
      const result = yield* runAdmin(admin.ps);
      if (Either.isLeft(result)) {
        return;
      }
      const before = (yield* getState).loaded.map((model) => model.name);
      const after = result.right.map((model) => model.name);
      if (before.join() !== after.join()) {
        yield* Effect.sync(() => log.info('ollama loaded models changed', { loaded: after }));
      }
      yield* updateState((state) => ({ ...state, loaded: result.right }));
    });

    const refresh: Effect.Effect<void> = Effect.gen(function* () {
      yield* updateState((state) => ({ ...state, kind: 'loading', error: undefined }));
      const started = yield* Effect.exit(ensureRunning);
      if (Exit.isFailure(started)) {
        return yield* fail(formatError(Cause.squash(started.cause)));
      }
      // The sidecar process spawns before its HTTP server is listening, so retry until the first
      // `list` succeeds rather than reporting a spurious failure on startup.
      const result = yield* runAdmin(
        admin.list.pipe(Effect.retry({ schedule: Schedule.spaced(Duration.millis(300)), times: 29 })),
      );
      if (Either.isLeft(result)) {
        return yield* fail(result.left);
      }
      yield* updateState((state) => ({ ...state, kind: 'ready', models: result.right, error: undefined }));
      yield* Effect.sync(() => log.info('ollama models', { installed: result.right.map((model) => model.name) }));
      yield* refreshLoaded;
    });

    const pull = (name: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        const started = yield* Effect.exit(ensureRunning);
        if (Exit.isFailure(started)) {
          return yield* fail(formatError(Cause.squash(started.cause)));
        }
        yield* setError(name, undefined);
        yield* Effect.sync(() => log.info('ollama pull started', { name }));
        yield* setProgress(name, { status: 'starting' });

        // Ollama reports `completed`/`total` per layer (digest); aggregate across layers so the
        // overall percent is monotonic rather than resetting to 0 as each layer starts.
        const downloaded = new Map<string, { completed: number; total: number }>();
        const onProgress = (progress: OllamaAdmin.PullProgress): Effect.Effect<void> =>
          Effect.suspend(() => {
            if (progress.digest && progress.total) {
              downloaded.set(progress.digest, { completed: progress.completed ?? 0, total: progress.total });
              let completed = 0;
              let total = 0;
              for (const layer of downloaded.values()) {
                completed += layer.completed;
                total += layer.total;
              }
              return setProgress(name, { status: progress.status, completed, total });
            }
            // Non-download phase (manifest, verifying, writing): keep the status label, drop totals.
            return setProgress(name, { status: progress.status });
          });

        // Run the pull on a daemon fiber so `cancel` can interrupt it; clear progress and drop the
        // fiber on every exit path. A cancelled pull interrupts the fiber — treated as a no-op.
        const work = admin.pull(name).pipe(
          Stream.runForEach(onProgress),
          Effect.provide(clientLayer),
          Effect.matchCauseEffect({
            onFailure: (cause) =>
              Cause.isInterruptedOnly(cause)
                ? Effect.sync(() => log.info('ollama pull finished', { name, cancelled: true }))
                : Effect.gen(function* () {
                    const message = formatError(Cause.squash(cause));
                    yield* Effect.sync(() => log.warn('ollama pull failed', { name, error: message }));
                    yield* setError(name, message);
                  }),
            onSuccess: () =>
              Effect.gen(function* () {
                yield* Effect.sync(() => log.info('ollama pull finished', { name, cancelled: false }));
                yield* refresh;
              }),
          }),
          Effect.ensuring(setProgress(name, undefined)),
          Effect.ensuring(Effect.sync(() => pullFibers.delete(name))),
        );

        const fiber = yield* Effect.forkDaemon(work);
        yield* Effect.sync(() => pullFibers.set(name, fiber));
      });

    const cancel = (name: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* Effect.sync(() => log.info('ollama pull cancelled', { name }));
        const fiber = pullFibers.get(name);
        if (fiber) {
          // The pull's `ensuring` clears progress and drops the fiber on interruption.
          yield* Fiber.interrupt(fiber);
        }
      });

    const load = (name: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* setError(name, undefined);
        const started = yield* Effect.exit(ensureRunning);
        if (Exit.isFailure(started)) {
          return yield* setError(name, formatError(Cause.squash(started.cause)));
        }
        yield* Effect.sync(() => log.info('ollama load', { name }));
        const result = yield* runAdmin(admin.load(name));
        if (Either.isLeft(result)) {
          yield* Effect.sync(() => log.warn('ollama load failed', { name, error: result.left }));
          return yield* setError(name, result.left);
        }
        yield* refreshLoaded;
      });

    const unload = (name: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* setError(name, undefined);
        const started = yield* Effect.exit(ensureRunning);
        if (Exit.isFailure(started)) {
          return yield* setError(name, formatError(Cause.squash(started.cause)));
        }
        yield* Effect.sync(() => log.info('ollama unload', { name }));
        const result = yield* runAdmin(admin.unload(name));
        if (Either.isLeft(result)) {
          return yield* setError(name, result.left);
        }
        yield* refreshLoaded;
      });

    const remove = (name: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* setError(name, undefined);
        const started = yield* Effect.exit(ensureRunning);
        if (Exit.isFailure(started)) {
          return yield* setError(name, formatError(Cause.squash(started.cause)));
        }
        const result = yield* runAdmin(admin.remove(name));
        if (Either.isLeft(result)) {
          return yield* setError(name, result.left);
        }
        yield* refresh;
      });

    const manager: Ollama.Manager = {
      endpoint: OLLAMA_HOST,
      state: stateAtom,
      refresh,
      refreshLoaded,
      pull,
      cancel,
      load,
      unload,
      remove,
    };

    return [
      // The runtime-dispose finalizer lives on the resolver contribution only; the manager closes
      // over the same runtime, so there is a single disposal path.
      Capability.provide(
        AppCapabilities.AiModelResolver,
        OllamaSidecarModelResolver.pipe(Layer.provide(sidecarLayer)),
        () => Effect.tryPromise(() => runtime.dispose()),
      ),
      Capability.provide(AssistantCapabilities.OllamaManager, manager),
    ];
  }),
);

class OllamaSidecar extends Context.Tag('@dxos/plugin-native/OllamaSidecar')<
  OllamaSidecar,
  {
    endpoint: string;
  }
>() {
  static layerLive = Layer.scoped(
    OllamaSidecar,
    Effect.gen(function* () {
      // The `ollama` launcher discovers `llama-server` + its libraries relative to its own
      // executable (`<exe>/lib/ollama/`), ignoring OLLAMA_LIBRARY_PATH, so the runtime ships into
      // `Contents/MacOS/lib/ollama` next to the signed sidecar (see tauri.conf bundle.macOS.files).
      const command = Command.sidecar('sidecar/ollama', ['serve'], {
        env: {
          OLLAMA_HOST,
          OLLAMA_ORIGINS: '*', // CORS
        },
      });

      // Ollama writes nearly all of its output (including normal startup/inference logs) to stderr,
      // so route by the structured `level=` field rather than the stream to avoid flooding the
      // console with red errors. Kept on `console.*` for Ollama's own line formatting.
      command.stdout.on('data', (data) => logSidecar(data.toString()));
      command.stderr.on('data', (data) => logSidecar(data.toString()));
      command.on('close', (code) => log.info('Ollama process exited', { code }));
      command.on('error', (error) => log.error('Ollama error', { error }));
      const child = yield* Effect.promise(() => command.spawn());
      yield* Effect.addFinalizer(
        Effect.fn(function* () {
          yield* Effect.promise(() => child.kill());
        }),
      );
      log.info('Running ollama', { pid: child.pid });

      return {
        endpoint: OLLAMA_HOST,
      };
    }),
  );
}

const OllamaSidecarModelResolver: Layer.Layer<AiModelResolver.AiModelResolver, never, OllamaSidecar> =
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const { endpoint } = yield* OllamaSidecar;
      return OllamaResolver.make({
        endpoint,
        provider: Provider.builtIn.id,
        transformClient: HttpClient.withTracerPropagation(false),
      });
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));

const formatError = (error: unknown): string =>
  typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);

/** Effect HttpClient layer shared by every admin call. */
const clientLayer = FetchHttpClient.layer;

/**
 * Route a chunk of Ollama process output to the console by its structured log level. Ollama emits
 * `INFO`/`WARN` to stderr alongside genuine errors, so only `level=ERROR` lines surface as errors.
 */
const logSidecar = (chunk: string): void => {
  for (const line of chunk.split('\n')) {
    if (line.trim().length === 0) {
      continue;
    }
    /* eslint-disable no-console */
    if (line.includes('level=ERROR')) {
      console.error('[ollama]', line);
    } else if (line.includes('level=WARN')) {
      console.warn('[ollama]', line);
    } else {
      console.log('[ollama]', line);
    }
    /* eslint-enable no-console */
  }
};
