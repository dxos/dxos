//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import { Command } from '@tauri-apps/plugin-shell';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';

import { type AiModelResolver } from '@dxos/ai';
import { OllamaAdmin, OllamaResolver } from '@dxos/ai/resolvers';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { AssistantCapabilities, type Ollama } from '@dxos/plugin-assistant';

// NOTE: Running ollama on non-standard port (config Tauri).
const OLLAMA_HOST = 'http://localhost:21434';

export type OllamaCapabilities =
  | Capability.Capability<typeof AppCapabilities.AiModelResolver>
  | Capability.Capability<typeof AssistantCapabilities.OllamaManager>;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

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

    // Forcing the scoped sidecar layer spawns the process idempotently — the runtime is lazy and
    // only spawns on first force, so opening settings starts Ollama rather than hitting a refused
    // connection, and a chat already using the resolver does not spawn a second process.
    const ensureRunning = (): Promise<string> =>
      runtime.runPromise(Effect.map(OllamaSidecar, ({ endpoint }) => endpoint));

    // In-flight pull controllers, so a pull can be cancelled.
    const pullControllers = new Map<string, AbortController>();

    // Connection-level failure (reaching the service); shown at the section, not tied to a model.
    const fail = (error: string): void => {
      registry.set(stateAtom, { ...registry.get(stateAtom), kind: 'failed', error });
    };

    // Per-model action error (load/unload/remove/pull); shown inline on that model's row. Pass
    // `undefined` to clear.
    const setError = (name: string, error: string | undefined): void => {
      const current = registry.get(stateAtom);
      const errors = { ...current.errors };
      if (error) {
        errors[name] = error;
      } else {
        delete errors[name];
      }
      registry.set(stateAtom, { ...current, errors });
    };

    // Refresh only the loaded-into-memory set (cheap; no spawn). Logs load/unload transitions so the
    // console reflects which model is resident when a chat request triggers a load.
    const refreshLoaded = async (): Promise<void> => {
      const result = await runAdmin(admin.ps);
      if (Either.isLeft(result)) {
        return;
      }
      const current = registry.get(stateAtom);
      const before = current.loaded.map((model) => model.name);
      const after = result.right.map((model) => model.name);
      if (before.join() !== after.join()) {
        log.info('ollama loaded models changed', { loaded: after });
      }
      registry.set(stateAtom, { ...current, loaded: result.right });
    };

    const refresh = async (): Promise<void> => {
      registry.set(stateAtom, { ...registry.get(stateAtom), kind: 'loading', error: undefined });
      try {
        await ensureRunning();
      } catch (error) {
        return fail(formatError(error));
      }
      // The sidecar process spawns before its HTTP server is listening, so retry until the first
      // `list` succeeds rather than reporting a spurious failure on startup.
      const result = await runAdmin(
        admin.list.pipe(Effect.retry({ schedule: Schedule.spaced(Duration.millis(300)), times: 29 })),
      );
      if (Either.isLeft(result)) {
        return fail(result.left);
      }
      registry.set(stateAtom, { ...registry.get(stateAtom), kind: 'ready', models: result.right, error: undefined });
      log.info('ollama models', { installed: result.right.map((model) => model.name) });
      await refreshLoaded();
    };

    // Write (or clear, when `progress` is undefined) the in-flight progress for `name`.
    const setProgress = (name: string, progress: OllamaAdmin.PullProgress | undefined): void => {
      const current = registry.get(stateAtom);
      const pulls = { ...current.pulls };
      if (progress) {
        pulls[name] = progress;
      } else {
        delete pulls[name];
      }
      registry.set(stateAtom, { ...current, pulls });
    };

    const pull = async (name: string): Promise<void> => {
      try {
        await ensureRunning();
      } catch (error) {
        return fail(formatError(error));
      }

      log.info('ollama pull started', { name });
      setError(name, undefined);
      const controller = new AbortController();
      pullControllers.set(name, controller);
      // Ollama reports `completed`/`total` per layer (digest); aggregate across layers so the
      // overall percent is monotonic rather than resetting to 0 as each layer starts.
      const downloaded = new Map<string, { completed: number; total: number }>();
      setProgress(name, { status: 'starting' });
      const error = await EffectEx.runPromise(
        admin.pull(name).pipe(
          Stream.runForEach((progress) =>
            Effect.sync(() => {
              if (progress.digest && progress.total) {
                downloaded.set(progress.digest, { completed: progress.completed ?? 0, total: progress.total });
                let completed = 0;
                let total = 0;
                for (const layer of downloaded.values()) {
                  completed += layer.completed;
                  total += layer.total;
                }
                setProgress(name, { status: progress.status, completed, total });
              } else {
                // Non-download phase (manifest, verifying, writing): keep the status label, drop totals.
                setProgress(name, { status: progress.status });
              }
            }),
          ),
          Effect.provide(clientLayer),
          Effect.either,
        ),
        { signal: controller.signal },
      )
        .then((result): string | undefined => (Either.isLeft(result) ? result.left.message : undefined))
        // A cancelled pull interrupts the fiber (runPromise rejects); treat it as a no-op below.
        .catch((): string | undefined => undefined);
      pullControllers.delete(name);
      setProgress(name, undefined);

      if (error !== undefined && !controller.signal.aborted) {
        log.warn('ollama pull failed', { name, error });
        return setError(name, error);
      }
      log.info('ollama pull finished', { name, cancelled: controller.signal.aborted });
      await refresh();
    };

    const cancel = (name: string): void => {
      log.info('ollama pull cancelled', { name });
      pullControllers.get(name)?.abort();
      pullControllers.delete(name);
      setProgress(name, undefined);
    };

    const load = async (name: string): Promise<void> => {
      setError(name, undefined);
      try {
        await ensureRunning();
      } catch (error) {
        return setError(name, formatError(error));
      }
      log.info('ollama load', { name });
      const result = await runAdmin(admin.load(name));
      if (Either.isLeft(result)) {
        log.warn('ollama load failed', { name, error: result.left });
        return setError(name, result.left);
      }
      await refreshLoaded();
    };

    const unload = async (name: string): Promise<void> => {
      setError(name, undefined);
      try {
        await ensureRunning();
      } catch (error) {
        return setError(name, formatError(error));
      }
      log.info('ollama unload', { name });
      const result = await runAdmin(admin.unload(name));
      if (Either.isLeft(result)) {
        return setError(name, result.left);
      }
      await refreshLoaded();
    };

    const remove = async (name: string): Promise<void> => {
      setError(name, undefined);
      try {
        await ensureRunning();
      } catch (error) {
        return setError(name, formatError(error));
      }
      const result = await runAdmin(admin.remove(name));
      if (Either.isLeft(result)) {
        return setError(name, result.left);
      }
      await refresh();
    };

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
      Capability.contributes(
        AppCapabilities.AiModelResolver,
        OllamaSidecarModelResolver.pipe(Layer.provide(sidecarLayer)),
        () => Effect.tryPromise(() => runtime.dispose()),
      ),
      Capability.contributes(AssistantCapabilities.OllamaManager, manager),
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
        transformClient: HttpClient.withTracerPropagation(false),
      });
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));

const formatError = (error: unknown): string =>
  typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);

/** Effect HttpClient layer shared by every admin call. */
const clientLayer = FetchHttpClient.layer;

/**
 * Run an admin effect (HttpClient provided) and fold its typed failure into a message, so the
 * Promise-based manager methods can branch on `Either.isLeft` without a typed error channel.
 */
const runAdmin = <A, E extends { readonly message: string }>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
): Promise<Either.Either<A, string>> =>
  EffectEx.runPromise(effect.pipe(Effect.provide(clientLayer), Effect.either)).then(
    Either.mapLeft((error) => error.message),
  );

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
