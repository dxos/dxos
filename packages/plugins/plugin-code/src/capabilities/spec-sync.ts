//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { SpecDocument } from '@dxos/types';

import { SyncBases, getSpecKey, resolveRoots, syncSpec } from '#sync';
import { CodeCapabilities } from '#types';

/** Polling keeps one code path for both hosts; a spec file is small and the dev route is on loopback. */
const SYNC_INTERVAL = '2 seconds';

/**
 * Keeps every spec that carries a `github.com/<owner>/<repo>` meta key in step with its file in a local checkout,
 * both ways, while the app runs. Hosts with no file access (a deployed web app) leave the state unavailable.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    const settings = yield* CodeCapabilities.Settings;
    const fs = FileSystem.get();
    const bases = new SyncBases();

    const state = Atom.make<CodeCapabilities.SpecSyncState>({ available: false, roots: [], specs: {} });
    // Mounted for the module's scope so passes that run with no subscriber keep their result.
    yield* Effect.acquireRelease(
      Effect.sync(() => registry.mount(state)),
      (unmount) => Effect.sync(unmount),
    );
    const wake = yield* Queue.sliding<void>(1);

    const pass = Effect.gen(function* () {
      const available =
        fs.kind === 'tauri' ||
        (yield* fs.roots().pipe(
          Effect.as(true),
          Effect.orElseSucceed(() => false),
        ));
      if (!available) {
        registry.set(state, { available, roots: [], specs: {} });
        return;
      }
      const roots = yield* resolveRoots(fs, registry.get(settings).repos);
      const codecs = yield* Capability.getAll(ProjectCapabilities.SpecDocumentCodec);
      const specs: Record<string, CodeCapabilities.SpecSyncEntry> = {};
      for (const space of client.spaces.get()) {
        if (!space.isOpen) {
          continue;
        }
        const linked = (yield* Effect.promise(() =>
          space.db.query(Filter.type(SpecDocument.SpecDocument)).run(),
        )).filter((spec) => getSpecKey(spec) !== undefined);
        for (const spec of linked) {
          // Loads the text the first time a spec is synced; later passes find it resolved.
          yield* Effect.promise(() => spec.content.load());
          const result = yield* syncSpec(spec, { fs, roots, bases, codecs });
          specs[spec.id] = { ...result, timestamp: Date.now() };
        }
      }
      registry.set(state, { available, roots, specs });
    });

    yield* Effect.forkScoped(
      Effect.gen(function* () {
        while (true) {
          // A failed pass (a space closing mid-query) is logged so the next pass still runs.
          yield* pass.pipe(
            Effect.catchCause((cause) => Effect.sync(() => log.warn('spec sync pass failed', { cause }))),
          );
          yield* Queue.take(wake).pipe(Effect.timeoutOption(SYNC_INTERVAL));
        }
      }),
    );

    return Capability.contribute(CodeCapabilities.SpecSync, {
      state,
      syncNow: () => void Queue.offerUnsafe(wake, undefined),
    });
  }),
);
